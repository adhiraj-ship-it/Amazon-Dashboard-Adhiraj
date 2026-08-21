import { TABS, type Brand } from "./config";
import { fetchTab } from "./googleSheets";
import { parseAdsRows, parseInventoryRows } from "./parse";
import { buildStyleRows, buildTotals, buildTrend, filterByRange } from "./aggregate";
import type { DashboardData } from "./types";

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function getDashboardData(
  brand: Brand,
  opts: { start?: string; end?: string } = {}
): Promise<DashboardData> {
  const [adsRaw, invRaw] = await Promise.all([
    fetchTab(TABS.adsData[brand]),
    fetchTab(TABS.inventory[brand]),
  ]);

  const adsRows = parseAdsRows(adsRaw, brand);
  const { rows: inventoryRows, asOf } = parseInventoryRows(invRaw, brand);

  if (adsRows.length === 0) {
    throw new Error(`No ads data parsed for brand "${brand}" — check sheet structure/tab access.`);
  }

  const dates = adsRows.map((r) => r.date).sort();
  const dataMinDate = dates[0];
  const dataMaxDate = dates[dates.length - 1];

  const rangeEnd = opts.end ?? dataMaxDate;
  const rangeStart = opts.start ?? addDays(rangeEnd, -29);

  const rowsInRange = filterByRange(adsRows, rangeStart, rangeEnd);
  const styles = buildStyleRows(rowsInRange, inventoryRows, rangeStart, rangeEnd);
  const totals = buildTotals(styles);
  const trend = buildTrend(rowsInRange);

  return {
    brand,
    asOf,
    rangeStart,
    rangeEnd,
    dataMinDate,
    dataMaxDate,
    totals,
    styles,
    trend,
    fetchedAt: new Date().toISOString(),
  };
}
