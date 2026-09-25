// Logistics Cost-Per-Unit (CPO) tracker — data source config.
//
// Source workbook: "CPO Tracker Ecom" (shared as "anyone with the link can
// view", so we always read it via CSV export — never via the service-account
// API path used by the Amazon ads dashboard, since that service account is
// not necessarily granted access to this separate sheet).
export const CPO_SHEET_ID = "155WMds_wtzuskBk5UWwTEG_bj3Raok13HXpW0R_wXI0";

export const CPO_TABS = {
  workingRca: { gid: "777671414" },
  masterTracker: { gid: "2094635479" },
} as const;

/**
 * Tab holding the manual first-mile CPO and per-channel adjustment factors.
 * Read by name (not gid) so it works the moment someone adds it to the
 * workbook, with no code change.
 */
export const OVERRIDES_TAB_NAME = "CPO Overrides";

// Only Invoice dates on/after this are in scope, per Adhiraj (2026-09-23):
// ignore all pre-Sept'26 history, this tracker starts fresh from here.
export const CUTOVER_DATE = "2026-09-01";

// SKU Code prefix (first 2 letters) -> brand. Confirmed against real SKU
// codes in Master Tracker; unknown prefixes fall back to showing the raw
// code so nothing is silently mislabeled.
export const BRAND_PREFIX_MAP: Record<string, string> = {
  HR: "HRX",
  RA: "Rare",
  SN: "Snitch",
  JP: "John Player",
  LC: "Lee Cooper",
  AR: "Arrow",
};

export type Channel = "Amazon" | "Myntra" | "B2B" | "D2C" | "Unclassified";

export const ACTIVE_CHANNELS: Channel[] = ["Amazon", "Myntra", "B2B", "D2C"];

// Legacy — Flipkart is no longer an active channel (per Adhiraj), but old
// rows may still carry FK codes; keep it recognizable so it doesn't get
// mis-bucketed into "Unclassified" or, worse, another channel.
export const LEGACY_CHANNEL_LABEL = "Flipkart (legacy)";

export type LegType =
  | "direct" // Factory -> Channel: fully channel-specific, no allocation needed
  | "warehouse-to-channel" // Warehouse -> Channel: last-mile actual + first-mile allocation
  | "global-pool" // Factory->Warehouse, Warehouse->Warehouse, or ->Enchante Brands (internal)
  | "unclassified"; // Could not determine source/destination node types

export const SIZE_BAND_LABELS: Record<string, string> = {
  CABIN: "Cabin",
  MEDIUM: "Medium",
  LARGE: "Large",
  "2PC SET": "2Pc Set",
  "3PC SET": "3Pc Set",
};
