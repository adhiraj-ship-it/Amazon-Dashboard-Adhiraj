import type { LegType } from "./config";
import type { Overrides } from "./overrides";

/** One row of the "Working RCA" tab — one dispatch/shipment. */
export interface WorkingRcaRow {
  dispatchNo: string;
  plant: string; // dispatch/factory location name
  whLocation: string; // drop location name, e.g. "Gurgaon-FKN-Flipkart"
  dispatchDate: string; // ISO yyyy-mm-dd, "" if unparseable
  invoiceDate: string; // ISO yyyy-mm-dd, "" if unparseable — used to scope global-pool legs, which never link to Master Tracker
  source: string; // "Factory" | "Warehouse" | ""
  destination: string; // "AMZ" | "Myntra" | "B2B" | "D2C" | "FK" | "TCI" | "ER" | ... | ""
  category: string; // "Trolley" | "Wallets" | "Backpacks" | ""
  style: string;
  netSupplied: number; // dispatch-level units actually accepted, post-rejection
  vehicleType: string; // from the second "Vehicle Type" column (classification block): "32 Ft" | "20 Ft" | "Others" | ...
  movementType: string; // "Factory" | "Intercity" | "Intracity" | ""
  zone: string; // "North" | "South" | "East" | "West" | ""
  detentionLoading: number;
  unloadingCharges: number;
  freightCharges: number;
  detentionUnloading: number;
  returnCharges: number;
}

/** One row of the "Master Tracker" tab — one SKU line within an invoice. */
export interface MasterTrackerRow {
  invoiceDate: string; // ISO yyyy-mm-dd, "" if unparseable
  invoiceNo: string;
  invoiceStatus: string; // "Cancelled" | "Inwarded" | "On the way" | ""
  invoiceType: string; // "B2B Sales" | "B2C" | ""
  customerName: string;
  skuCode: string;
  itemName: string;
  quantity: number;
  rejectedQty: number;
  finalQty: number;
  style: string;
  size: string; // raw size label, e.g. "3PC SET", "Cabin"
  channel: string; // rarely populated directly ("FK" | "AZ" | "")
  dispatchNo: string; // join key back to WorkingRcaRow.dispatchNo, "" if unlinked
  prodVol: number; // total volume for this line (qty-based), 0 if unavailable
  invoiceValue: number; // "Total After Rejections" — value of the goods that actually landed
}

/**
 * One fully-resolved SKU line: a Master Tracker row joined to its dispatch
 * (when linkable), with cost allocated by volumetric share and the leg
 * classified as direct / warehouse-to-channel / global-pool / unclassified.
 */
export interface LineItem {
  invoiceDate: string;
  monthKey: string; // "2026-09"
  brand: string;
  style: string;
  sizeBand: string; // normalized: "Cabin" | "Medium" | "Large" | "2Pc Set" | "3Pc Set"
  category: string;
  customerName: string;
  // Resolved channel label: an active Channel value, LEGACY_CHANNEL_LABEL,
  // or "Internal" (Enchante-Brands-as-customer, never a channel).
  channel: string;
  legType: LegType;
  finalQty: number;
  perPieceVolume: number; // prodVol / quantity for this SKU line, 0 if quantity is 0
  volumeWeight: number; // perPieceVolume * finalQty — the allocation weight
  dispatchNo: string;
  hasDispatchMatch: boolean;
  // Warehouse -> Channel dispatch where source=Warehouse, vehicle type
  // "Others", movement type "Intracity" and freight cost is 0 — your own
  // warehouse and the channel's fulfillment point are co-located, so there's
  // no real transport leg, just the first-mile allocation.
  isIntra: boolean;
  invoiceValue: number; // this line's own invoice value, for cost-as-%-of-value
  rcaZone: string; // raw Zone from the dispatch, "" when unmatched
  rcaVehicleType: string; // raw Vehicle Type from the dispatch, "" when unmatched
  // This line's volume-weighted share of its dispatch's actual charges
  // (0 for lines with no dispatch match — no cost data to share).
  lastMileFreight: number;
  lastMileDetentionLoading: number;
  lastMileDetentionUnloading: number;
  lastMileUnloading: number;
  lastMileReturn: number;
  // Filled in during aggregation (global-pool rate applied to warehouse-to-channel lines).
  firstMileAllocation: number;
}

export interface CostBreakdown {
  freight: number;
  detentionLoading: number;
  detentionUnloading: number;
  unloading: number;
  returnCharges: number;
  firstMileAllocation: number;
  total: number;
}

export interface ChannelMonthSummary {
  channel: string;
  monthKey: string;
  dispatchesDirect: number; // Factory -> Channel dispatches (distinct dispatch numbers)
  dispatchesFromWarehouse: number; // Warehouse -> Channel dispatches
  unitsSold: number; // Final Qty, Inwarded + On the way, excludes Cancelled
  unitsWithCostMatch: number; // subset of unitsSold whose dispatch cost could be matched
  coveragePct: number; // unitsWithCostMatch / unitsSold
  cost: CostBreakdown;
  cpo: number; // cost.total / unitsSold
}

export interface BrandMonthSummary {
  brand: string;
  monthKey: string;
  unitsSold: number;
  cost: CostBreakdown;
  cpo: number;
}

export interface SizeBandSummary {
  sizeBand: string;
  unitsSold: number;
  cost: CostBreakdown;
  cpo: number;
}


/** One Working-RCA dispatch feeding the global (first-mile) pool for a month. */
export interface GlobalPoolDispatch {
  dispatchNo: string;
  invoiceDate: string;
  source: string;
  destination: string;
  whLocation: string;
  style: string;
  netSupplied: number;
  volumeWeight: number;
  cost: number;
  freightCost: number;
  detentionHandlingCost: number;
  zone: string;
  vehicleType: string;
  movementType: string; // needed to apply the same intra test the channel side uses
}

/** The first-mile pool rate for one month, with the raw cost/volume and every dispatch behind it — fully auditable, not just the resulting number. */
export interface GlobalPoolMonthSummary {
  monthKey: string;
  totalCost: number;
  totalVolume: number;
  rate: number; // totalCost / totalVolume, $ per volume-unit
  dispatches: GlobalPoolDispatch[];
}

export type MovementLane = "direct" | "warehouse" | "intra";


/** A column group in the movement table: a sales channel, or the shared pool. */
export type BlockKey = "Amazon" | "Myntra" | "Global";

/** One movement-tag column within a block, e.g. "F to AZ" / "WH to AZ" / "WH to WH". */
export interface MovementLaneRow {
  label: string;
  dispatches: number;
  unitsMoved: number;
  freightCost: number;
  detentionHandlingCost: number;
  firstMileAllocation: number;
  adjustment: number; // rupee effect of the channel's manual adjustment factor
  totalCost: number;
}

export interface MovementBlock {
  block: BlockKey;
  monthKey: string;
  brand: string; // "Overall", or a single brand when the table is filtered
  lanes: MovementLaneRow[]; // movement tags, excluding the Total column
  total: MovementLaneRow; // the "Total" column
  adjustmentFactor: number; // the factor applied, 0 when none is set
  invoiceValue: number; // value of the goods behind this block's units
  costPctOfInvoiceValue: number;
  unitsMoved: number; // block level only
  cpo: number; // total.totalCost / unitsMoved
}

export interface BreakdownBrandCell {
  units: number;
  cost: number;
  pct: number; // share of this column (or of the share-basis subset)
  cpo: number;
}

export interface BreakdownCell extends BreakdownBrandCell {
  byBrand: Record<string, BreakdownBrandCell>;
}

/** One row of a diagnostic breakdown (zone / size / truck), split by brand within each column. */
export interface BreakdownRow {
  label: string;
  cells: Record<string, BreakdownCell>;
  isTotal?: boolean;
}

export interface BreakdownTable {
  monthKey: string;
  columns: string[]; // e.g. [Amazon,Myntra,Overall] or [Global]
  brands: string[];
  rows: BreakdownRow[];
  /** Columns with totals but no brand split (pool dispatches carry Style, never a brand). */
  brandUnavailableColumns: string[];
  /** Columns with no usable source data at all (Size isn't tracked per pool dispatch). */
  unavailableColumns: string[];
}

export interface UtilisationCell {
  volume: number;
  capacity: number;
  dispatches: number;
  pct: number;
  capacityKnown: boolean;
}

export interface UtilisationRow {
  truck: string;
  capacityPerTruck: number;
  cells: Record<string, UtilisationCell>;
}

export interface UtilisationTable {
  monthKey: string;
  columns: string[];
  rows: UtilisationRow[];
}

/** Brand CPO scoped to one channel, with its size drill-down. */
export interface BrandChannelSummary {
  channel: string;
  monthKey: string;
  brand: string;
  unitsSold: number;
  cost: CostBreakdown;
  cpo: number;
  sizes: SizeBandSummary[];
}

export interface BrandSizeBandSummary extends SizeBandSummary {
  brand: string;
  monthKey: string;
}

/** The one-line headline strip above the movement table. */
export interface HeadlineSummary {
  monthKey: string;
  totalDispatches: number;
  totalCost: number;
  unitsMoved: number;
  amazonCpo: number;
  myntraCpo: number;
  invoiceValue: number;
  costPctOfInvoiceValue: number;
}

/** What the first-mile rate actually resolved to for a month, and whether it came from the sheet or by hand. */
export interface FirstMileRateSource {
  monthKey: string;
  computedCpoPerUnit: number; // pool cost / warehouse-routed units, for reference
  appliedCpoPerUnit: number; // what was actually allocated
  manual: boolean;
}

export interface DataQuality {
  totalMasterTrackerRows: number;
  droppedJunkRows: number; // blank Invoice Status AND blank Invoice No
  cancelledRows: number;
  soldRowsTotal: number;
  soldRowsWithDispatchMatch: number;
  unclassifiedLegRows: number; // sold rows WITH a dispatch match whose leg type still couldn't be determined
  dispatchLinkMismatch: number; // dispatch value present but not found in Working RCA
}

export interface CpoDashboardData {
  fetchedAt: string;
  cutoverDate: string;
  months: string[]; // sorted ascending, e.g. ["2026-09", "2026-10"]
  channelMonthly: ChannelMonthSummary[];
  brandMonthly: BrandMonthSummary[];
  brandChannel: BrandChannelSummary[];
  brandSizeBand: BrandSizeBandSummary[];
  brandsByMonth: Record<string, string[]>; // month -> brands, for the movement filter
  globalPool: GlobalPoolMonthSummary[];
  headline: HeadlineSummary[];
  firstMileRates: FirstMileRateSource[];
  overrides: Overrides;
  overridesTabFound: boolean;
  overridesSkippedRows: string[];
  overridesTabName: string;
  sheetUrl: string;
  movementBlocks: MovementBlock[];
  ecom: {
    zone: BreakdownTable[];
    size: BreakdownTable[];
    truck: BreakdownTable[];
    utilisation: UtilisationTable[];
  };
  global: {
    zone: BreakdownTable[];
    truck: BreakdownTable[];
    utilisation: UtilisationTable[];
  };
  dataQuality: DataQuality;
}
