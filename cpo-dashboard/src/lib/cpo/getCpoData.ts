import {
  applyFirstMileAllocation,
  buildBrandMonthly,
  buildBrandSizeBand,
  buildChannelMonthly,
  buildHeadline,
  buildLineItems,
  buildMovementBlocks,
  buildSizeBreakdown,
  buildTruckBreakdown,
  buildZoneBreakdown,
  computeGlobalPool,
} from "./aggregate";
import { CPO_SHEET_ID, CPO_TABS, CUTOVER_DATE, OVERRIDES_TAB_NAME } from "./config";
import { fetchCpoTab } from "./fetchCpoTab";
import { readOverrides } from "./overrides";
import { parseMasterTracker, parseWorkingRca } from "./parse";
import type { CpoDashboardData } from "./types";

export async function getCpoData(): Promise<CpoDashboardData> {
  const [rcaRaw, mtRaw] = await Promise.all([
    fetchCpoTab(CPO_TABS.workingRca.gid),
    fetchCpoTab(CPO_TABS.masterTracker.gid),
  ]);

  const rcaRows = parseWorkingRca(rcaRaw);
  const mtRows = parseMasterTracker(mtRaw);
  const rawMasterTrackerRowCount = Math.max(mtRaw.length - 1, 0); // minus header

  const { lineItems, dataQuality } = buildLineItems(rcaRows, mtRows, rawMasterTrackerRowCount, CUTOVER_DATE);

  const overridesResult = await readOverrides();
  const overrides = overridesResult.overrides;

  const globalPool = computeGlobalPool(rcaRows, mtRows, CUTOVER_DATE);
  const globalPoolRateByMonth = Object.fromEntries(globalPool.map((p) => [p.monthKey, p.rate]));
  const firstMileRates = applyFirstMileAllocation(lineItems, globalPoolRateByMonth, overrides);

  const channelMonthly = buildChannelMonthly(lineItems);
  const brandMonthly = buildBrandMonthly(lineItems);

  const months = [...new Set([...channelMonthly.map((c) => c.monthKey), ...globalPool.map((p) => p.monthKey)])].sort();

  const movementBlocks = buildMovementBlocks(lineItems, globalPool, months, overrides);
  const headline = buildHeadline(lineItems, movementBlocks, months);
  const zoneBreakdown = buildZoneBreakdown(lineItems, globalPool, months);
  const sizeBreakdown = buildSizeBreakdown(lineItems, months);
  const truckBreakdown = buildTruckBreakdown(lineItems, globalPool, months);
  const brandSizeBand = buildBrandSizeBand(lineItems);

  return {
    fetchedAt: new Date().toISOString(),
    cutoverDate: CUTOVER_DATE,
    months,
    channelMonthly,
    brandMonthly,
    brandSizeBand,
    globalPool,
    headline,
    firstMileRates,
    overrides,
    overridesTabFound: overridesResult.tabFound,
    overridesSkippedRows: overridesResult.skippedRows,
    overridesTabName: OVERRIDES_TAB_NAME,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${CPO_SHEET_ID}/edit`,
    movementBlocks,
    zoneBreakdown,
    sizeBreakdown,
    truckBreakdown,
    dataQuality,
  };
}
