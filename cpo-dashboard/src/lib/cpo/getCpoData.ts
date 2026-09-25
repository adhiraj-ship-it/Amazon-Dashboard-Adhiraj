import {
  ALL_BRANDS,
  applyFirstMileAllocation,
  buildBrandChannel,
  buildBrandMonthly,
  buildBrandSizeBand,
  buildChannelMonthly,
  buildHeadline,
  buildLineItems,
  buildMovementBlocks,
  computeGlobalPool,
} from "./aggregate";
import {
  brandsForMonth,
  buildSizeBreakdown,
  buildTruckBreakdown,
  buildUtilisation,
  buildZoneBreakdown,
  type BreakdownScope,
} from "./breakdowns";
import { CPO_SHEET_ID, CPO_TABS, CUTOVER_DATE, OVERRIDES_TAB_NAME } from "./config";
import { fetchCpoTab } from "./fetchCpoTab";
import { readOverrides } from "./overrides";
import { parseMasterTracker, parseWorkingRca } from "./parse";
import type { CpoDashboardData, MovementBlock } from "./types";

/** Channel columns plus a combined one; Global is deliberately absent — it has its own tab. */
const ECOM_SCOPE: BreakdownScope = {
  columns: ["Amazon", "Myntra", "Overall"],
  channelsFor: {
    Amazon: ["Amazon"],
    Myntra: ["Myntra"],
    Overall: ["Amazon", "Myntra"],
  },
};

const GLOBAL_SCOPE: BreakdownScope = {
  columns: ["Global"],
  channelsFor: { Global: [] },
  poolColumns: ["Global"],
};

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
  const brandChannel = buildBrandChannel(lineItems);

  const months = [...new Set([...channelMonthly.map((c) => c.monthKey), ...globalPool.map((p) => p.monthKey)])].sort();

  const brandsByMonth: Record<string, string[]> = {};
  for (const monthKey of months) {
    brandsByMonth[monthKey] = brandsForMonth(lineItems, monthKey, ["Amazon", "Myntra"]);
  }

  // One set of blocks per brand (plus Overall) so the movement table can be
  // filtered without another round trip.
  const movementBlocks: MovementBlock[] = [...buildMovementBlocks(lineItems, globalPool, months, overrides, ALL_BRANDS)];
  for (const brand of [...new Set(Object.values(brandsByMonth).flat())]) {
    movementBlocks.push(...buildMovementBlocks(lineItems, globalPool, months, overrides, brand));
  }

  const headline = buildHeadline(lineItems, movementBlocks, months);

  return {
    fetchedAt: new Date().toISOString(),
    cutoverDate: CUTOVER_DATE,
    months,
    channelMonthly,
    brandMonthly,
    brandChannel,
    brandSizeBand: buildBrandSizeBand(lineItems),
    brandsByMonth,
    globalPool,
    headline,
    firstMileRates,
    overrides,
    overridesTabFound: overridesResult.tabFound,
    overridesSkippedRows: overridesResult.skippedRows,
    overridesTabName: OVERRIDES_TAB_NAME,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${CPO_SHEET_ID}/edit`,
    movementBlocks,
    ecom: {
      zone: buildZoneBreakdown(lineItems, globalPool, months, ECOM_SCOPE),
      size: buildSizeBreakdown(lineItems, months, ECOM_SCOPE),
      truck: buildTruckBreakdown(lineItems, globalPool, months, ECOM_SCOPE),
      utilisation: buildUtilisation(lineItems, globalPool, months, ECOM_SCOPE),
    },
    global: {
      zone: buildZoneBreakdown(lineItems, globalPool, months, GLOBAL_SCOPE),
      truck: buildTruckBreakdown(lineItems, globalPool, months, GLOBAL_SCOPE),
      utilisation: buildUtilisation(lineItems, globalPool, months, GLOBAL_SCOPE),
    },
    dataQuality,
  };
}
