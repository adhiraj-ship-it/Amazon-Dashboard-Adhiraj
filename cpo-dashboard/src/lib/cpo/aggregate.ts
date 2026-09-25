import { LEGACY_CHANNEL_LABEL, type LegType } from "./config";
import { EMPTY_OVERRIDES, type Overrides } from "./overrides";
import { deriveBrandFromSku, normalizeSizeBand } from "./parse";
import type {
  BlockKey,
  BrandMonthSummary,
  BrandSizeBandSummary,
  BreakdownCell,
  BreakdownRow,
  BreakdownTable,
  ChannelMonthSummary,
  CostBreakdown,
  DataQuality,
  FirstMileRateSource,
  GlobalPoolDispatch,
  GlobalPoolMonthSummary,
  HeadlineSummary,
  LineItem,
  MasterTrackerRow,
  MovementBlock,
  MovementLane,
  MovementLaneRow,
  WorkingRcaRow,
} from "./types";

function emptyCost(): CostBreakdown {
  return {
    freight: 0,
    detentionLoading: 0,
    detentionUnloading: 0,
    unloading: 0,
    returnCharges: 0,
    firstMileAllocation: 0,
    total: 0,
  };
}

function addCost(a: CostBreakdown, b: Partial<CostBreakdown>) {
  a.freight += b.freight ?? 0;
  a.detentionLoading += b.detentionLoading ?? 0;
  a.detentionUnloading += b.detentionUnloading ?? 0;
  a.unloading += b.unloading ?? 0;
  a.returnCharges += b.returnCharges ?? 0;
  a.firstMileAllocation += b.firstMileAllocation ?? 0;
  a.total =
    a.freight + a.detentionLoading + a.detentionUnloading + a.unloading + a.returnCharges + a.firstMileAllocation;
}

/**
 * Source=Warehouse, Vehicle Type "Others", Movement Type "Intracity", freight
 * cost 0 — own warehouse and channel's fulfillment point are co-located.
 *
 * All four conditions matter. Freight alone is not enough: `toNumber` coerces
 * blank/"NA"/"#N/A" cells to 0, so a real inter-city truck with an unfilled
 * freight cell would otherwise be mistaken for a co-located transfer.
 */
function isIntraShape(source: string, vehicleType: string, movementType: string, freightCharges: number): boolean {
  return (
    source === "Warehouse" &&
    vehicleType.trim().toLowerCase() === "others" &&
    movementType.trim().toLowerCase() === "intracity" &&
    freightCharges === 0
  );
}

function isIntraLeg(rca: WorkingRcaRow | undefined): boolean {
  if (!rca) return false;
  return isIntraShape(rca.source, rca.vehicleType, rca.movementType, rca.freightCharges);
}

/** Classifies a dispatch's destination purely from RCA's own SOURCE/DESTINATION/WH Location text — no customer name needed. */
function destinationKind(rca: { destination: string; whLocation: string }): "channel" | "warehouse" | "unknown" {
  const text = (rca.destination || rca.whLocation || "").toLowerCase();
  if (/myntra|amazon|\bamz\b|flipkart|\bfk\b|\bd2c\b|\bb2b\b/.test(text)) return "channel";
  if (/\b(tci|er|alite|alpha|fc|vf|wh|warehouse|others)\b/.test(text)) return "warehouse";
  return "unknown";
}

/** Resolves the sales channel and the logistics leg type for one Master Tracker line + its matched dispatch. */
function classify(mt: MasterTrackerRow, rca: WorkingRcaRow | undefined): { channel: string; legType: LegType } {
  const customer = mt.customerName.toLowerCase();
  if (/enchante/.test(customer)) {
    return { channel: "Internal", legType: "global-pool" };
  }

  const signalText = [customer, mt.channel, rca?.destination, rca?.whLocation].filter(Boolean).join(" ").toLowerCase();

  let channel = "Unclassified";
  if (/myntra/.test(signalText)) channel = "Myntra";
  else if (/amazon|\bamz\b/.test(signalText)) channel = "Amazon";
  else if (/flipkart|\bfk\b/.test(signalText)) channel = LEGACY_CHANNEL_LABEL;
  else if (/\bd2c\b/.test(signalText)) channel = "D2C";
  else if (mt.invoiceType.toUpperCase().includes("B2B")) channel = "B2B";
  else if (mt.invoiceType.toUpperCase().includes("B2C")) channel = "D2C";

  if (!rca) {
    // No dispatch match at all: we know the sales channel but can't tell how the goods moved.
    return { channel, legType: "unclassified" };
  }

  const isChannelDest = channel !== "Unclassified";

  if (isChannelDest) {
    if (rca.source === "Factory") return { channel, legType: "direct" };
    if (rca.source === "Warehouse") return { channel, legType: "warehouse-to-channel" };
    return { channel, legType: "unclassified" };
  }
  if (destinationKind(rca) === "warehouse") {
    return { channel, legType: "global-pool" };
  }
  return { channel, legType: "unclassified" };
}

export interface BuildResult {
  lineItems: LineItem[];
  dataQuality: DataQuality;
}

export function buildLineItems(
  rcaRows: WorkingRcaRow[],
  mtRowsRaw: MasterTrackerRow[],
  rawMasterTrackerRowCount: number,
  cutoverDate: string
): BuildResult {
  const rcaByDispatch = new Map<string, WorkingRcaRow>();
  for (const r of rcaRows) rcaByDispatch.set(r.dispatchNo, r);

  const inScope = mtRowsRaw.filter((r) => r.invoiceDate && r.invoiceDate >= cutoverDate);

  const cancelledRows = inScope.filter((r) => r.invoiceStatus === "Cancelled").length;
  const soldRows = inScope.filter((r) => r.invoiceStatus === "Inwarded" || r.invoiceStatus === "On the way");

  let dispatchLinkMismatch = 0;
  for (const r of soldRows) {
    if (r.dispatchNo && !rcaByDispatch.has(r.dispatchNo)) dispatchLinkMismatch++;
  }

  // Group sold rows by dispatch so cost can be split by volumetric share within each dispatch.
  const byDispatch = new Map<string, MasterTrackerRow[]>();
  const noDispatch: MasterTrackerRow[] = [];
  for (const r of soldRows) {
    if (r.dispatchNo && rcaByDispatch.has(r.dispatchNo)) {
      const list = byDispatch.get(r.dispatchNo) ?? [];
      list.push(r);
      byDispatch.set(r.dispatchNo, list);
    } else {
      noDispatch.push(r);
    }
  }

  const lineItems: LineItem[] = [];
  let ambiguousLegRows = 0;

  const toLineItem = (mt: MasterTrackerRow, rca: WorkingRcaRow | undefined, shareOfDispatch: number): LineItem => {
    const { channel, legType } = classify(mt, rca);
    // Only count as "ambiguous" when we DO have a dispatch record but still
    // couldn't tell where it went — distinct from simply having no dispatch
    // match at all (that's already reflected in the coverage %).
    if (legType === "unclassified" && rca) ambiguousLegRows++;
    const perPieceVolume = mt.quantity > 0 ? mt.prodVol / mt.quantity : 0;
    const volumeWeight = perPieceVolume * mt.finalQty;
    const hasDispatchMatch = Boolean(rca);
    return {
      invoiceDate: mt.invoiceDate,
      monthKey: mt.invoiceDate.slice(0, 7),
      brand: deriveBrandFromSku(mt.skuCode),
      style: mt.style,
      sizeBand: normalizeSizeBand(mt.size),
      category: rca?.category || "",
      customerName: mt.customerName,
      channel,
      legType,
      finalQty: mt.finalQty,
      perPieceVolume,
      volumeWeight,
      dispatchNo: mt.dispatchNo,
      hasDispatchMatch,
      isIntra: isIntraLeg(rca),
      invoiceValue: mt.invoiceValue,
      rcaZone: rca?.zone ?? "",
      rcaVehicleType: rca?.vehicleType ?? "",
      lastMileFreight: hasDispatchMatch ? rca!.freightCharges * shareOfDispatch : 0,
      lastMileDetentionLoading: hasDispatchMatch ? rca!.detentionLoading * shareOfDispatch : 0,
      lastMileDetentionUnloading: hasDispatchMatch ? rca!.detentionUnloading * shareOfDispatch : 0,
      lastMileUnloading: hasDispatchMatch ? rca!.unloadingCharges * shareOfDispatch : 0,
      lastMileReturn: hasDispatchMatch ? rca!.returnCharges * shareOfDispatch : 0,
      firstMileAllocation: 0, // filled in once the global-pool rate is known
    };
  };

  for (const [dispatchNo, lines] of byDispatch) {
    const rca = rcaByDispatch.get(dispatchNo);
    const totalVolume = lines.reduce((s, l) => s + (l.quantity > 0 ? (l.prodVol / l.quantity) * l.finalQty : 0), 0);
    const totalFinalQty = lines.reduce((s, l) => s + l.finalQty, 0);
    for (const l of lines) {
      const lineVolume = l.quantity > 0 ? (l.prodVol / l.quantity) * l.finalQty : 0;
      const share = totalVolume > 0 ? lineVolume / totalVolume : totalFinalQty > 0 ? l.finalQty / totalFinalQty : 0;
      lineItems.push(toLineItem(l, rca, share));
    }
  }
  for (const l of noDispatch) {
    lineItems.push(toLineItem(l, undefined, 0));
  }

  const dataQuality: DataQuality = {
    totalMasterTrackerRows: rawMasterTrackerRowCount,
    droppedJunkRows: rawMasterTrackerRowCount - mtRowsRaw.length,
    cancelledRows,
    soldRowsTotal: soldRows.length,
    soldRowsWithDispatchMatch: soldRows.length - noDispatch.length,
    unclassifiedLegRows: ambiguousLegRows,
    dispatchLinkMismatch,
  };

  return { lineItems, dataQuality };
}

/**
 * $ per volume-unit, by month, for the global pool (Factory→Warehouse,
 * Warehouse→Warehouse legs).
 *
 * These dispatches never link to Master Tracker at all — they're pure
 * internal stock movement, not customer invoices (confirmed against the
 * real sheet: 0 of the Sept'26 Factory/Warehouse→TCI/ER dispatches have a
 * matching Master Tracker row). So this scans Working RCA directly, using
 * its own Invoice Date and Net Supplied — not the SKU-line join used for
 * channel-bound legs.
 *
 * Working RCA has no per-dispatch Size (only Style), so the volumetric
 * weight here uses each style's average per-piece volume observed in
 * Master Tracker, rather than an exact SKU/size lookup. The rate is still
 * $-per-volume-unit, so it stays dimensionally consistent with the exact
 * per-SKU volume weights used on the outbound (warehouse-to-channel) side.
 */
export function computeGlobalPool(
  rcaRows: WorkingRcaRow[],
  mtRowsRaw: MasterTrackerRow[],
  cutoverDate: string
): GlobalPoolMonthSummary[] {
  const styleVolume = new Map<string, { sum: number; count: number }>();
  let overallSum = 0;
  let overallCount = 0;
  for (const r of mtRowsRaw) {
    if (r.quantity <= 0 || r.prodVol <= 0) continue;
    const perPiece = r.prodVol / r.quantity;
    const s = styleVolume.get(r.style) ?? { sum: 0, count: 0 };
    s.sum += perPiece;
    s.count += 1;
    styleVolume.set(r.style, s);
    overallSum += perPiece;
    overallCount += 1;
  }
  const overallAvgVolume = overallCount > 0 ? overallSum / overallCount : 1;
  const avgVolumeForStyle = (style: string) => {
    const s = styleVolume.get(style);
    return s && s.count > 0 ? s.sum / s.count : overallAvgVolume;
  };

  const byMonth = new Map<string, GlobalPoolDispatch[]>();
  for (const rca of rcaRows) {
    if (!rca.invoiceDate || rca.invoiceDate < cutoverDate) continue;
    if (rca.source !== "Factory" && rca.source !== "Warehouse") continue;
    if (destinationKind(rca) !== "warehouse") continue;
    if (rca.netSupplied <= 0) continue;

    const monthKey = rca.invoiceDate.slice(0, 7);
    const detentionHandlingCost = rca.detentionLoading + rca.detentionUnloading + rca.unloadingCharges + rca.returnCharges;
    const cost = rca.freightCharges + detentionHandlingCost;
    const volumeWeight = avgVolumeForStyle(rca.style) * rca.netSupplied;
    const list = byMonth.get(monthKey) ?? [];
    list.push({
      dispatchNo: rca.dispatchNo,
      invoiceDate: rca.invoiceDate,
      source: rca.source,
      destination: rca.destination || rca.whLocation,
      whLocation: rca.whLocation,
      style: rca.style,
      netSupplied: rca.netSupplied,
      volumeWeight,
      cost,
      freightCost: rca.freightCharges,
      detentionHandlingCost,
      zone: rca.zone,
      vehicleType: rca.vehicleType,
      movementType: rca.movementType,
    });
    byMonth.set(monthKey, list);
  }

  const summaries: GlobalPoolMonthSummary[] = [];
  for (const [monthKey, dispatches] of byMonth) {
    const totalCost = dispatches.reduce((s, d) => s + d.cost, 0);
    const totalVolume = dispatches.reduce((s, d) => s + d.volumeWeight, 0);
    summaries.push({
      monthKey,
      totalCost,
      totalVolume,
      rate: totalVolume > 0 ? totalCost / totalVolume : 0,
      dispatches: dispatches.sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate)),
    });
  }
  return summaries.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

/**
 * Mutates warehouse-to-channel lines in place, adding their first-mile
 * allocation, and reports what rate each month actually used.
 *
 * A manually entered first-mile CPO is a per-UNIT rupee figure, but it's still
 * spread volumetrically: the month's pot becomes (entered CPO × warehouse-routed
 * units) and each unit takes its volume share of that pot. So a Large still
 * absorbs more than a Cabin, while the month's average lands exactly on the
 * number that was typed in. Entering it flat per unit would have thrown away
 * the size fairness the whole model is built on.
 */
export function applyFirstMileAllocation(
  lineItems: LineItem[],
  volumeRateByMonth: Record<string, number>,
  overrides: Overrides = EMPTY_OVERRIDES
): FirstMileRateSource[] {
  const months = [...new Set(lineItems.map((l) => l.monthKey))].sort();
  const sources: FirstMileRateSource[] = [];

  for (const monthKey of months) {
    const routed = lineItems.filter((l) => l.legType === "warehouse-to-channel" && l.monthKey === monthKey);
    const totalUnits = routed.reduce((s, l) => s + l.finalQty, 0);
    const totalVolume = routed.reduce((s, l) => s + l.volumeWeight, 0);

    const computedRate = volumeRateByMonth[monthKey] ?? 0;
    const computedPot = computedRate * totalVolume;
    const computedCpoPerUnit = totalUnits > 0 ? computedPot / totalUnits : 0;

    const manualCpo = overrides.firstMileCpo[monthKey];
    const manual = typeof manualCpo === "number" && Number.isFinite(manualCpo);
    const pot = manual ? manualCpo * totalUnits : computedPot;
    const perVolume = totalVolume > 0 ? pot / totalVolume : 0;

    for (const l of routed) {
      l.firstMileAllocation = perVolume * l.volumeWeight;
    }

    sources.push({
      monthKey,
      computedCpoPerUnit,
      appliedCpoPerUnit: totalUnits > 0 ? pot / totalUnits : 0,
      manual,
    });
  }
  return sources;
}

function channelLines(lineItems: LineItem[]) {
  return lineItems.filter((l) => l.legType === "direct" || l.legType === "warehouse-to-channel");
}

/** All sold lines that represent an actual customer sale (i.e. not an internal Enchante-Brands transfer). */
function saleLines(lineItems: LineItem[]) {
  return lineItems.filter((l) => l.channel !== "Internal");
}

export function buildChannelMonthly(lineItems: LineItem[]): ChannelMonthSummary[] {
  // Grouped over ALL sold lines (minus internal transfers) so units that
  // couldn't be cost-classified still show up — as "Unclassified" — instead
  // of silently vanishing from the totals.
  const groups = new Map<string, LineItem[]>();
  for (const l of saleLines(lineItems)) {
    const key = `${l.channel}__${l.monthKey}`;
    const list = groups.get(key) ?? [];
    list.push(l);
    groups.set(key, list);
  }

  const summaries: ChannelMonthSummary[] = [];
  for (const [key, lines] of groups) {
    const [channel, monthKey] = key.split("__");
    const cost = emptyCost();
    let unitsSold = 0;
    let unitsWithCostMatch = 0;
    const directDispatches = new Set<string>();
    const warehouseDispatches = new Set<string>();
    for (const l of lines) {
      unitsSold += l.finalQty;
      if (l.legType === "direct" || l.legType === "warehouse-to-channel") {
        unitsWithCostMatch += l.finalQty;
        addCost(cost, {
          freight: l.lastMileFreight,
          detentionLoading: l.lastMileDetentionLoading,
          detentionUnloading: l.lastMileDetentionUnloading,
          unloading: l.lastMileUnloading,
          returnCharges: l.lastMileReturn,
          firstMileAllocation: l.firstMileAllocation,
        });
        if (l.legType === "direct") directDispatches.add(l.dispatchNo);
        else warehouseDispatches.add(l.dispatchNo);
      }
    }
    summaries.push({
      channel,
      monthKey,
      dispatchesDirect: directDispatches.size,
      dispatchesFromWarehouse: warehouseDispatches.size,
      unitsSold,
      unitsWithCostMatch,
      coveragePct: unitsSold > 0 ? unitsWithCostMatch / unitsSold : 0,
      cost,
      // Computed over units we actually have cost data for, not all sold
      // units — otherwise a coverage gap would silently deflate CPO instead
      // of just showing up as a lower coverage %.
      cpo: unitsWithCostMatch > 0 ? cost.total / unitsWithCostMatch : 0,
    });
  }
  return summaries.sort((a, b) => a.channel.localeCompare(b.channel) || a.monthKey.localeCompare(b.monthKey));
}

export function buildBrandMonthly(lineItems: LineItem[]): BrandMonthSummary[] {
  const groups = new Map<string, LineItem[]>();
  for (const l of channelLines(lineItems)) {
    const key = `${l.brand}__${l.monthKey}`;
    const list = groups.get(key) ?? [];
    list.push(l);
    groups.set(key, list);
  }
  const summaries: BrandMonthSummary[] = [];
  for (const [key, lines] of groups) {
    const [brand, monthKey] = key.split("__");
    const cost = emptyCost();
    let unitsSold = 0;
    for (const l of lines) {
      unitsSold += l.finalQty;
      if (l.hasDispatchMatch) {
        addCost(cost, {
          freight: l.lastMileFreight,
          detentionLoading: l.lastMileDetentionLoading,
          detentionUnloading: l.lastMileDetentionUnloading,
          unloading: l.lastMileUnloading,
          returnCharges: l.lastMileReturn,
          firstMileAllocation: l.firstMileAllocation,
        });
      }
    }
    summaries.push({ brand, monthKey, unitsSold, cost, cpo: unitsSold > 0 ? cost.total / unitsSold : 0 });
  }
  return summaries.sort((a, b) => a.brand.localeCompare(b.brand) || a.monthKey.localeCompare(b.monthKey));
}

function laneOf(l: LineItem): MovementLane | null {
  if (l.legType === "direct") return "direct";
  if (l.legType === "warehouse-to-channel") return l.isIntra ? "intra" : "warehouse";
  return null;
}

const BLOCKS: BlockKey[] = ["Amazon", "Myntra", "Global"];

function emptyLane(label: string): MovementLaneRow {
  return {
    label,
    dispatches: 0,
    unitsMoved: 0,
    freightCost: 0,
    detentionHandlingCost: 0,
    firstMileAllocation: 0,
    adjustment: 0,
    totalCost: 0,
  };
}

/**
 * The adjustment factor is applied as its own rupee line rather than as a
 * multiplier on the displayed CPO, so Total Cost ÷ Units still equals the CPO
 * shown. A hidden multiplier would make the table stop reconciling.
 */
function sealLane(lane: MovementLaneRow, adjustmentFactor = 0): MovementLaneRow {
  const base = lane.freightCost + lane.detentionHandlingCost + lane.firstMileAllocation;
  lane.adjustment = base * adjustmentFactor;
  lane.totalCost = base + lane.adjustment;
  return lane;
}

/**
 * The movement table: Amazon / Myntra blocks split into F→channel, WH→channel
 * and intra lanes, plus a Global block splitting the first-mile pool into
 * F→WH and WH→WH. Units and CPO are block-level only (a per-lane unit count
 * would invite dividing a lane's cost by a lane's units, which isn't how the
 * allocation works).
 */
export function buildMovementBlocks(
  lineItems: LineItem[],
  globalPool: GlobalPoolMonthSummary[],
  months: string[],
  overrides: Overrides = EMPTY_OVERRIDES
): MovementBlock[] {
  const out: MovementBlock[] = [];

  for (const monthKey of months) {
    for (const block of BLOCKS) {
      if (block === "Global") {
        const pool = globalPool.find((p) => p.monthKey === monthKey);
        const fToWh = emptyLane("F to WH");
        const whToWh = emptyLane("WH to WH");
        let unitsMoved = 0;
        for (const d of pool?.dispatches ?? []) {
          const lane = d.source === "Factory" ? fToWh : whToWh;
          lane.dispatches += 1;
          lane.unitsMoved += d.netSupplied;
          lane.freightCost += d.freightCost;
          lane.detentionHandlingCost += d.detentionHandlingCost;
          unitsMoved += d.netSupplied;
        }
        const lanes = [sealLane(fToWh), sealLane(whToWh)];
        const total = sealLane({
          label: "Total",
          dispatches: lanes.reduce((s, l) => s + l.dispatches, 0),
          unitsMoved: lanes.reduce((s, l) => s + l.unitsMoved, 0),
          freightCost: lanes.reduce((s, l) => s + l.freightCost, 0),
          detentionHandlingCost: lanes.reduce((s, l) => s + l.detentionHandlingCost, 0),
          firstMileAllocation: 0,
          adjustment: 0,
          totalCost: 0,
        });
        out.push({
          block,
          monthKey,
          lanes,
          total,
          adjustmentFactor: 0,
          unitsMoved,
          cpo: unitsMoved > 0 ? total.totalCost / unitsMoved : 0,
        });
        continue;
      }

      const adjustmentFactor = overrides.adjustmentFactor[monthKey]?.[block] ?? 0;
      const tag = block === "Amazon" ? "AZ" : "MN";
      const direct = emptyLane(`F to ${tag}`);
      const warehouse = emptyLane(`WH to ${tag}`);
      const intra = emptyLane("WH to WH");
      const dispatchSets = { direct: new Set<string>(), warehouse: new Set<string>(), intra: new Set<string>() };
      let unitsMoved = 0;

      for (const l of channelLines(lineItems)) {
        if (l.channel !== block || l.monthKey !== monthKey) continue;
        const laneKey = laneOf(l);
        if (!laneKey) continue;
        const lane = laneKey === "direct" ? direct : laneKey === "warehouse" ? warehouse : intra;
        dispatchSets[laneKey].add(l.dispatchNo);
        lane.unitsMoved += l.finalQty;
        lane.freightCost += l.lastMileFreight;
        lane.detentionHandlingCost +=
          l.lastMileDetentionLoading + l.lastMileDetentionUnloading + l.lastMileUnloading + l.lastMileReturn;
        lane.firstMileAllocation += l.firstMileAllocation;
        unitsMoved += l.finalQty;
      }
      direct.dispatches = dispatchSets.direct.size;
      warehouse.dispatches = dispatchSets.warehouse.size;
      intra.dispatches = dispatchSets.intra.size;

      const lanes = [sealLane(direct, adjustmentFactor), sealLane(warehouse, adjustmentFactor), sealLane(intra, adjustmentFactor)];
      const total = sealLane({
        label: "Total",
        dispatches: lanes.reduce((s, l) => s + l.dispatches, 0),
        unitsMoved: lanes.reduce((s, l) => s + l.unitsMoved, 0),
        freightCost: lanes.reduce((s, l) => s + l.freightCost, 0),
        detentionHandlingCost: lanes.reduce((s, l) => s + l.detentionHandlingCost, 0),
        firstMileAllocation: lanes.reduce((s, l) => s + l.firstMileAllocation, 0),
        adjustment: 0,
        totalCost: 0,
      }, adjustmentFactor);
      out.push({
        block,
        monthKey,
        lanes,
        total,
        adjustmentFactor,
        unitsMoved,
        cpo: unitsMoved > 0 ? total.totalCost / unitsMoved : 0,
      });
    }
  }
  return out;
}

const ZONE_ROWS = ["North", "South", "East", "West", "Intra"];
const SIZE_ORDER = ["Cabin", "Medium", "2Pc Set", "Large", "3Pc Set"];

/** Intra legs never leave the premises, so they have no zone. */
function resolveZone(rawZone: string, isIntra: boolean): string {
  if (isIntra) return "Intra";
  const z = rawZone.trim().toLowerCase();
  if (z.startsWith("north")) return "North";
  if (z.startsWith("south")) return "South";
  if (z.startsWith("east")) return "East";
  if (z.startsWith("west")) return "West";
  return "Unknown";
}

const TRUCK_ROWS = ["32ft", "20ft", "14ft", "10ft", "8ft"];
const TRUCK_UNSPECIFIED = "Unspecified / intra";

/** Only the real truck sizes count — blanks and "Others" (intra, no truck) are excluded from both numerator and denominator. */
function resolveTruck(rawVehicleType: string): string | null {
  const v = rawVehicleType.trim().toLowerCase().replace(/\s+/g, "");
  for (const t of TRUCK_ROWS) {
    const n = t.replace("ft", "");
    if (v === t || v === `${n}ft.` || v === n) return t;
  }
  return null;
}

function emptyCells(): Record<BlockKey, BreakdownCell> {
  return {
    Amazon: { byBrand: {}, units: 0, pct: 0 },
    Myntra: { byBrand: {}, units: 0, pct: 0 },
    Global: { byBrand: {}, units: 0, pct: 0 },
  };
}

/** Brand sub-columns, ordered by how much they actually moved that month. */
function brandsForMonth(lineItems: LineItem[], monthKey: string): string[] {
  const totals = new Map<string, number>();
  for (const l of channelLines(lineItems)) {
    if (l.monthKey !== monthKey) continue;
    if (l.channel !== 'Amazon' && l.channel !== 'Myntra') continue;
    totals.set(l.brand, (totals.get(l.brand) ?? 0) + l.finalQty);
  }
  return [...totals.entries()].sort((x, y) => y[1] - x[1]).map(([brand]) => brand);
}

/**
 * `alwaysShow` rows render even when empty, so a breakdown keeps a stable
 * shape month to month (an absent 14ft truck row means "none this month",
 * not "we stopped tracking it"). Anything else only appears when it has data.
 */
function finishBreakdown(
  monthKey: string,
  alwaysShow: string[],
  tally: Map<string, Record<BlockKey, BreakdownCell>>,
  brands: string[],
  unavailableBlocks: BlockKey[],
  brandUnavailableBlocks: BlockKey[],
  /** Rows that count toward the Share denominator. Defaults to every row. */
  shareBasisLabels?: string[]
): BreakdownTable {
  const totals: Record<BlockKey, number> = { Amazon: 0, Myntra: 0, Global: 0 };
  for (const [label, cells] of tally.entries()) {
    if (shareBasisLabels && !shareBasisLabels.includes(label)) continue;
    for (const b of BLOCKS) totals[b] += cells[b].units;
  }
  const extras = [...tally.keys()].filter((label) => !alwaysShow.includes(label));
  const rows: BreakdownRow[] = [...alwaysShow, ...extras].map((label) => {
    const cells = tally.get(label) ?? emptyCells();
    const inShareBasis = !shareBasisLabels || shareBasisLabels.includes(label);
    for (const b of BLOCKS) {
      cells[b].pct = inShareBasis && totals[b] > 0 ? cells[b].units / totals[b] : 0;
    }
    return { label, cells };
  });
  return { monthKey, brands, rows, unavailableBlocks, brandUnavailableBlocks };
}

/** Pool dispatches carry Style but never a brand, so Global gets a total with no brand split. */
const GLOBAL_HAS_NO_BRAND: BlockKey[] = ['Global'];

export function buildZoneBreakdown(
  lineItems: LineItem[],
  globalPool: GlobalPoolMonthSummary[],
  months: string[]
): BreakdownTable[] {
  return months.map((monthKey) => {
    const tally = new Map<string, Record<BlockKey, BreakdownCell>>();
    const bump = (label: string, block: BlockKey, units: number, brand?: string) => {
      const cells = tally.get(label) ?? emptyCells();
      cells[block].units += units;
      if (brand) cells[block].byBrand[brand] = (cells[block].byBrand[brand] ?? 0) + units;
      tally.set(label, cells);
    };

    for (const l of channelLines(lineItems)) {
      if (l.monthKey !== monthKey) continue;
      if (l.channel !== 'Amazon' && l.channel !== 'Myntra') continue;
      // Same intra rule the movement table uses, so the two never disagree.
      bump(resolveZone(l.rcaZone, l.isIntra), l.channel as BlockKey, l.finalQty, l.brand);
    }
    const pool = globalPool.find((p) => p.monthKey === monthKey);
    for (const d of pool?.dispatches ?? []) {
      // Same 4-condition test as the channel side. Freight alone would file a
      // Factory dispatch with a blank freight cell under "Intra" and throw its
      // real zone away.
      bump(resolveZone(d.zone, isIntraShape(d.source, d.vehicleType, d.movementType, d.freightCost)), 'Global', d.netSupplied);
    }
    return finishBreakdown(monthKey, ZONE_ROWS, tally, brandsForMonth(lineItems, monthKey), [], GLOBAL_HAS_NO_BRAND);
  });
}

export function buildSizeBreakdown(lineItems: LineItem[], months: string[]): BreakdownTable[] {
  return months.map((monthKey) => {
    const tally = new Map<string, Record<BlockKey, BreakdownCell>>();
    const labels: string[] = [];
    for (const l of channelLines(lineItems)) {
      if (l.monthKey !== monthKey) continue;
      if (l.channel !== 'Amazon' && l.channel !== 'Myntra') continue;
      const cells = tally.get(l.sizeBand) ?? emptyCells();
      cells[l.channel as BlockKey].units += l.finalQty;
      cells[l.channel as BlockKey].byBrand[l.brand] = (cells[l.channel as BlockKey].byBrand[l.brand] ?? 0) + l.finalQty;
      if (!tally.has(l.sizeBand)) labels.push(l.sizeBand);
      tally.set(l.sizeBand, cells);
    }
    const ordered = [...SIZE_ORDER, ...labels.filter((l) => !SIZE_ORDER.includes(l))];
    // Working RCA records only Style for pool dispatches, never Size, so the
    // Global column genuinely has no size data to report.
    return finishBreakdown(monthKey, ordered, tally, brandsForMonth(lineItems, monthKey), ['Global'], GLOBAL_HAS_NO_BRAND);
  });
}

export function buildTruckBreakdown(
  lineItems: LineItem[],
  globalPool: GlobalPoolMonthSummary[],
  months: string[]
): BreakdownTable[] {
  return months.map((monthKey) => {
    const tally = new Map<string, Record<BlockKey, BreakdownCell>>();
    const bump = (label: string, block: BlockKey, units: number, brand?: string) => {
      const cells = tally.get(label) ?? emptyCells();
      cells[block].units += units;
      if (brand) cells[block].byBrand[brand] = (cells[block].byBrand[brand] ?? 0) + units;
      tally.set(label, cells);
    };

    // Units on a vehicle that isn't one of the five truck sizes still moved and
    // still cost money, so they get an "Unspecified" row rather than being
    // dropped — otherwise this table's Amazon total silently disagrees with the
    // Zone and Size tables beside it. They stay out of the Share denominator.
    for (const l of channelLines(lineItems)) {
      if (l.monthKey !== monthKey) continue;
      if (l.channel !== 'Amazon' && l.channel !== 'Myntra') continue;
      bump(resolveTruck(l.rcaVehicleType) ?? TRUCK_UNSPECIFIED, l.channel as BlockKey, l.finalQty, l.brand);
    }
    const pool = globalPool.find((p) => p.monthKey === monthKey);
    for (const d of pool?.dispatches ?? []) {
      bump(resolveTruck(d.vehicleType) ?? TRUCK_UNSPECIFIED, 'Global', d.netSupplied);
    }
    return finishBreakdown(
      monthKey,
      [...TRUCK_ROWS, TRUCK_UNSPECIFIED],
      tally,
      brandsForMonth(lineItems, monthKey),
      [],
      GLOBAL_HAS_NO_BRAND,
      TRUCK_ROWS
    );
  });
}

export function buildBrandSizeBand(lineItems: LineItem[]): BrandSizeBandSummary[] {
  const groups = new Map<string, LineItem[]>();
  for (const l of channelLines(lineItems)) {
    const key = `${l.brand}__${l.monthKey}__${l.sizeBand}`;
    const list = groups.get(key) ?? [];
    list.push(l);
    groups.set(key, list);
  }
  const out: BrandSizeBandSummary[] = [];
  for (const [key, lines] of groups) {
    const [brand, monthKey, sizeBand] = key.split("__");
    const cost = emptyCost();
    let unitsSold = 0;
    for (const l of lines) {
      unitsSold += l.finalQty;
      addCost(cost, {
        freight: l.lastMileFreight,
        detentionLoading: l.lastMileDetentionLoading,
        detentionUnloading: l.lastMileDetentionUnloading,
        unloading: l.lastMileUnloading,
        returnCharges: l.lastMileReturn,
        firstMileAllocation: l.firstMileAllocation,
      });
    }
    out.push({ brand, monthKey, sizeBand, unitsSold, cost, cpo: unitsSold > 0 ? cost.total / unitsSold : 0 });
  }
  return out.sort((a, b) => a.brand.localeCompare(b.brand) || b.unitsSold - a.unitsSold);
}

export function buildHeadline(
  lineItems: LineItem[],
  movementBlocks: MovementBlock[],
  months: string[]
): HeadlineSummary[] {
  return months.map((monthKey) => {
    const blocks = movementBlocks.filter((b) => b.monthKey === monthKey);
    const amazon = blocks.find((b) => b.block === "Amazon");
    const myntra = blocks.find((b) => b.block === "Myntra");

    let invoiceValue = 0;
    for (const l of channelLines(lineItems)) {
      if (l.monthKey !== monthKey) continue;
      if (l.channel !== "Amazon" && l.channel !== "Myntra") continue;
      invoiceValue += l.invoiceValue;
    }

    const totalDispatches = blocks.reduce((s, b) => s + b.total.dispatches, 0);
    const totalCost = blocks.reduce((s, b) => s + b.total.totalCost, 0);
    const unitsMoved = blocks.reduce((s, b) => s + b.unitsMoved, 0);
    // The pool's cost lands on channel units as first-mile allocation, so
    // channel cost alone is the right numerator against invoice value.
    const channelCost = (amazon?.total.totalCost ?? 0) + (myntra?.total.totalCost ?? 0);

    return {
      monthKey,
      totalDispatches,
      totalCost,
      unitsMoved,
      amazonCpo: amazon?.cpo ?? 0,
      myntraCpo: myntra?.cpo ?? 0,
      invoiceValue,
      costPctOfInvoiceValue: invoiceValue > 0 ? channelCost / invoiceValue : 0,
    };
  });
}
