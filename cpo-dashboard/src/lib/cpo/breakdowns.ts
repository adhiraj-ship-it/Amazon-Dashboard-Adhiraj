import { TRUCK_CAPACITY } from "./config";
import type {
  BreakdownBrandCell,
  BreakdownCell,
  BreakdownRow,
  BreakdownTable,
  GlobalPoolMonthSummary,
  LineItem,
  UtilisationRow,
  UtilisationTable,
} from "./types";

export const ZONE_ROWS = ["North", "South", "East", "West", "Intra"];
export const SIZE_ORDER = ["Cabin", "Medium", "2Pc Set", "Large", "3Pc Set"];
export const TRUCK_ROWS = ["32ft", "20ft", "14ft", "10ft", "8ft"];
export const TRUCK_UNSPECIFIED = "Unspecified / intra";
export const OTHERS = "Others";
export const TOTAL_ROW = "Total";

/** Intra legs never leave the premises, so they have no zone. */
export function resolveZone(rawZone: string, isIntra: boolean): string {
  if (isIntra) return "Intra";
  const z = rawZone.trim().toLowerCase();
  if (z.startsWith("north")) return "North";
  if (z.startsWith("south")) return "South";
  if (z.startsWith("east")) return "East";
  if (z.startsWith("west")) return "West";
  return OTHERS;
}

/** Real truck sizes only; blanks and "Others" (intra, no truck) fall through to null. */
export function resolveTruck(rawVehicleType: string): string | null {
  const v = rawVehicleType.trim().toLowerCase().replace(/\s+/g, "");
  for (const t of TRUCK_ROWS) {
    const n = t.replace("ft", "");
    if (v === t || v === `${n}ft.` || v === n) return t;
  }
  return null;
}

export function lineCost(l: LineItem): number {
  return (
    l.lastMileFreight +
    l.lastMileDetentionLoading +
    l.lastMileDetentionUnloading +
    l.lastMileUnloading +
    l.lastMileReturn +
    l.firstMileAllocation
  );
}

function emptyBrandCell(): BreakdownBrandCell {
  return { units: 0, cost: 0, pct: 0, cpo: 0 };
}

function emptyCell(): BreakdownCell {
  return { byBrand: {}, units: 0, cost: 0, pct: 0, cpo: 0 };
}

function finish(cell: BreakdownBrandCell) {
  cell.cpo = cell.units > 0 ? cell.cost / cell.units : 0;
}

/**
 * Builders below share this shape: a tally of row label -> column -> cell,
 * finished into ordered rows with a Total row appended.
 *
 * `shareBasisLabels` limits the % denominator without hiding the units — the
 * truck table needs unspecified-vehicle units visible in the totals but out of
 * the ratio, so the two can't be the same set.
 */
function finishTable(
  monthKey: string,
  columns: string[],
  alwaysShow: string[],
  tally: Map<string, Record<string, BreakdownCell>>,
  brands: string[],
  brandUnavailableColumns: string[],
  unavailableColumns: string[],
  shareBasisLabels?: string[]
): BreakdownTable {
  const colTotals: Record<string, number> = {};
  const brandTotals: Record<string, Record<string, number>> = {};
  for (const c of columns) {
    colTotals[c] = 0;
    brandTotals[c] = {};
  }
  for (const [label, byColumn] of tally.entries()) {
    if (shareBasisLabels && !shareBasisLabels.includes(label)) continue;
    for (const c of columns) {
      const cell = byColumn[c];
      if (!cell) continue;
      colTotals[c] += cell.units;
      for (const [brand, bc] of Object.entries(cell.byBrand)) {
        brandTotals[c][brand] = (brandTotals[c][brand] ?? 0) + bc.units;
      }
    }
  }

  const extras = [...tally.keys()].filter((l) => !alwaysShow.includes(l));
  const labels = [...alwaysShow, ...extras];

  const totalRowCells: Record<string, BreakdownCell> = {};
  for (const c of columns) totalRowCells[c] = emptyCell();

  const rows: BreakdownRow[] = labels.map((label) => {
    const byColumn = tally.get(label) ?? {};
    const inShare = !shareBasisLabels || shareBasisLabels.includes(label);
    const cells: Record<string, BreakdownCell> = {};
    for (const c of columns) {
      const cell = byColumn[c] ?? emptyCell();
      cell.pct = inShare && colTotals[c] > 0 ? cell.units / colTotals[c] : 0;
      finish(cell);
      for (const [brand, bc] of Object.entries(cell.byBrand)) {
        bc.pct = inShare && (brandTotals[c][brand] ?? 0) > 0 ? bc.units / brandTotals[c][brand] : 0;
        finish(bc);
      }
      cells[c] = cell;

      // Roll every row into the Total row, including rows kept out of the ratio.
      const t = totalRowCells[c];
      t.units += cell.units;
      t.cost += cell.cost;
      for (const [brand, bc] of Object.entries(cell.byBrand)) {
        const tb = (t.byBrand[brand] ??= emptyBrandCell());
        tb.units += bc.units;
        tb.cost += bc.cost;
      }
    }
    return { label, cells };
  });

  for (const c of columns) {
    const t = totalRowCells[c];
    t.pct = 1;
    finish(t);
    for (const bc of Object.values(t.byBrand)) {
      bc.pct = 1;
      finish(bc);
    }
  }
  rows.push({ label: TOTAL_ROW, cells: totalRowCells, isTotal: true });

  return { monthKey, columns, brands, rows, brandUnavailableColumns, unavailableColumns };
}

function bump(
  tally: Map<string, Record<string, BreakdownCell>>,
  label: string,
  column: string,
  units: number,
  cost: number,
  brand?: string
) {
  const byColumn = tally.get(label) ?? {};
  const cell = (byColumn[column] ??= emptyCell());
  cell.units += units;
  cell.cost += cost;
  if (brand) {
    const bc = (cell.byBrand[brand] ??= emptyBrandCell());
    bc.units += units;
    bc.cost += cost;
  }
  tally.set(label, byColumn);
}

/** Brand sub-columns, ordered by how much they actually moved that month. */
export function brandsForMonth(lineItems: LineItem[], monthKey: string, channels: string[]): string[] {
  const totals = new Map<string, number>();
  for (const l of lineItems) {
    if (l.monthKey !== monthKey || !channels.includes(l.channel)) continue;
    totals.set(l.brand, (totals.get(l.brand) ?? 0) + l.finalQty);
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([brand]) => brand);
}

export interface BreakdownScope {
  /** Column keys, e.g. ["Amazon","Myntra","Overall"] or ["Global"]. */
  columns: string[];
  /** Channels feeding each column; "Overall" typically spans several. */
  channelsFor: Record<string, string[]>;
  /** Columns sourced from the pool rather than channel line items. */
  poolColumns?: string[];
}

export function buildZoneBreakdown(
  lineItems: LineItem[],
  globalPool: GlobalPoolMonthSummary[],
  months: string[],
  scope: BreakdownScope
): BreakdownTable[] {
  return months.map((monthKey) => {
    const tally = new Map<string, Record<string, BreakdownCell>>();
    for (const column of scope.columns) {
      if (scope.poolColumns?.includes(column)) {
        const pool = globalPool.find((p) => p.monthKey === monthKey);
        for (const d of pool?.dispatches ?? []) {
          const intra = d.source === "Warehouse" && d.vehicleType.trim().toLowerCase() === "others" && d.freightCost === 0;
          bump(tally, resolveZone(d.zone, intra), column, d.netSupplied, d.cost);
        }
        continue;
      }
      const channels = scope.channelsFor[column] ?? [];
      for (const l of lineItems) {
        if (l.monthKey !== monthKey || !channels.includes(l.channel)) continue;
        bump(tally, resolveZone(l.rcaZone, l.isIntra), column, l.finalQty, lineCost(l), l.brand);
      }
    }
    const brands = brandsForMonth(lineItems, monthKey, Object.values(scope.channelsFor).flat());
    return finishTable(monthKey, scope.columns, ZONE_ROWS, tally, brands, scope.poolColumns ?? [], []);
  });
}

export function buildSizeBreakdown(lineItems: LineItem[], months: string[], scope: BreakdownScope): BreakdownTable[] {
  return months.map((monthKey) => {
    const tally = new Map<string, Record<string, BreakdownCell>>();
    const seen: string[] = [];
    for (const column of scope.columns) {
      if (scope.poolColumns?.includes(column)) continue; // no Size on pool dispatches
      const channels = scope.channelsFor[column] ?? [];
      for (const l of lineItems) {
        if (l.monthKey !== monthKey || !channels.includes(l.channel)) continue;
        const band = SIZE_ORDER.includes(l.sizeBand) ? l.sizeBand : OTHERS;
        if (!seen.includes(band)) seen.push(band);
        bump(tally, band, column, l.finalQty, lineCost(l), l.brand);
      }
    }
    const ordered = [...SIZE_ORDER, ...seen.filter((s) => !SIZE_ORDER.includes(s))];
    const brands = brandsForMonth(lineItems, monthKey, Object.values(scope.channelsFor).flat());
    return finishTable(
      monthKey,
      scope.columns,
      ordered,
      tally,
      brands,
      scope.poolColumns ?? [],
      scope.poolColumns ?? []
    );
  });
}

export function buildTruckBreakdown(
  lineItems: LineItem[],
  globalPool: GlobalPoolMonthSummary[],
  months: string[],
  scope: BreakdownScope
): BreakdownTable[] {
  return months.map((monthKey) => {
    const tally = new Map<string, Record<string, BreakdownCell>>();
    for (const column of scope.columns) {
      if (scope.poolColumns?.includes(column)) {
        const pool = globalPool.find((p) => p.monthKey === monthKey);
        for (const d of pool?.dispatches ?? []) {
          bump(tally, resolveTruck(d.vehicleType) ?? TRUCK_UNSPECIFIED, column, d.netSupplied, d.cost);
        }
        continue;
      }
      const channels = scope.channelsFor[column] ?? [];
      for (const l of lineItems) {
        if (l.monthKey !== monthKey || !channels.includes(l.channel)) continue;
        bump(tally, resolveTruck(l.rcaVehicleType) ?? TRUCK_UNSPECIFIED, column, l.finalQty, lineCost(l), l.brand);
      }
    }
    const brands = brandsForMonth(lineItems, monthKey, Object.values(scope.channelsFor).flat());
    return finishTable(
      monthKey,
      scope.columns,
      [...TRUCK_ROWS, TRUCK_UNSPECIFIED],
      tally,
      brands,
      scope.poolColumns ?? [],
      [],
      TRUCK_ROWS
    );
  });
}

/**
 * How full the trucks actually ran: goods volume carried versus the usable
 * volume of the truck that carried it.
 *
 * Capacity is per dispatch, so volume and capacity are both accumulated at
 * dispatch level — averaging per-dispatch percentages would over-weight a
 * nearly-empty small truck against a full large one.
 */
export function buildUtilisation(
  lineItems: LineItem[],
  globalPool: GlobalPoolMonthSummary[],
  months: string[],
  scope: BreakdownScope
): UtilisationTable[] {
  return months.map((monthKey) => {
    // column -> truck -> { volume, dispatches }
    const acc = new Map<string, Map<string, { volume: number; dispatches: Set<string> }>>();
    const touch = (column: string, truck: string) => {
      const byTruck = acc.get(column) ?? new Map();
      const entry = byTruck.get(truck) ?? { volume: 0, dispatches: new Set<string>() };
      byTruck.set(truck, entry);
      acc.set(column, byTruck);
      return entry;
    };

    for (const column of scope.columns) {
      if (scope.poolColumns?.includes(column)) {
        const pool = globalPool.find((p) => p.monthKey === monthKey);
        for (const d of pool?.dispatches ?? []) {
          const truck = resolveTruck(d.vehicleType);
          if (!truck) continue;
          const e = touch(column, truck);
          e.volume += d.volumeWeight;
          e.dispatches.add(d.dispatchNo);
        }
        continue;
      }
      const channels = scope.channelsFor[column] ?? [];
      for (const l of lineItems) {
        if (l.monthKey !== monthKey || !channels.includes(l.channel)) continue;
        const truck = resolveTruck(l.rcaVehicleType);
        if (!truck || !l.dispatchNo) continue;
        const e = touch(column, truck);
        e.volume += l.volumeWeight;
        e.dispatches.add(l.dispatchNo);
      }
    }

    const rows: UtilisationRow[] = TRUCK_ROWS.map((truck) => {
      const capacity = TRUCK_CAPACITY[truck] ?? 0;
      const cells: UtilisationRow["cells"] = {};
      for (const column of scope.columns) {
        const e = acc.get(column)?.get(truck);
        const dispatches = e?.dispatches.size ?? 0;
        const totalCapacity = capacity * dispatches;
        cells[column] = {
          volume: e?.volume ?? 0,
          capacity: totalCapacity,
          dispatches,
          pct: totalCapacity > 0 ? (e?.volume ?? 0) / totalCapacity : 0,
          capacityKnown: capacity > 0,
        };
      }
      return { truck, capacityPerTruck: capacity, cells };
    });

    return { monthKey, columns: scope.columns, rows };
  });
}
