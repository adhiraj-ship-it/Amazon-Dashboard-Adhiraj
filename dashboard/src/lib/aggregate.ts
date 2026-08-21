import type { AdsRow, InventoryRow, Metrics, StyleRow } from "./types";

function daysBetweenInclusive(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(diff + 1, 1);
}

function sum(rows: AdsRow[], key: "spend" | "units" | "impressions" | "clicks" | "revenue"): number {
  return rows.reduce((acc, r) => acc + r[key], 0);
}

function deriveMetrics(rows: AdsRow[], rangeDays: number, inventoryUnits: number): Metrics {
  const units = sum(rows, "units");
  const revenue = sum(rows, "revenue");
  const spend = sum(rows, "spend");
  const impressions = sum(rows, "impressions");
  const clicks = sum(rows, "clicks");
  const drr = units / rangeDays;

  return {
    units,
    revenue,
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
    roas: spend > 0 ? revenue / spend : 0,
    cac: units > 0 ? spend / units : 0,
    drr,
    inventory: inventoryUnits,
    doh: drr > 0 ? inventoryUnits / drr : Infinity,
  };
}

export function filterByRange(rows: AdsRow[], startIso: string, endIso: string): AdsRow[] {
  return rows.filter((r) => r.date >= startIso && r.date <= endIso);
}

export function buildStyleRows(
  adsRowsInRange: AdsRow[],
  inventoryRows: InventoryRow[],
  startIso: string,
  endIso: string
): StyleRow[] {
  const rangeDays = daysBetweenInclusive(startIso, endIso);

  const inventoryByStyle = new Map<string, number>();
  const inventoryByStyleSize = new Map<string, number>();
  for (const r of inventoryRows) {
    inventoryByStyle.set(r.style, (inventoryByStyle.get(r.style) ?? 0) + r.units);
    const key = `${r.style}__${r.size}`;
    inventoryByStyleSize.set(key, (inventoryByStyleSize.get(key) ?? 0) + r.units);
  }

  const rowsByStyle = new Map<string, AdsRow[]>();
  for (const r of adsRowsInRange) {
    if (!rowsByStyle.has(r.style)) rowsByStyle.set(r.style, []);
    rowsByStyle.get(r.style)!.push(r);
  }

  // Union of styles seen in ads data or inventory, so a style with stock but
  // no sales in range (or vice versa) still shows up.
  const allStyles = new Set<string>([...rowsByStyle.keys(), ...inventoryByStyle.keys()]);

  const styles: StyleRow[] = [];
  for (const style of allStyles) {
    const styleAdsRows = rowsByStyle.get(style) ?? [];
    const styleInventory = inventoryByStyle.get(style) ?? 0;

    const rowsBySize = new Map<string, AdsRow[]>();
    for (const r of styleAdsRows) {
      if (!rowsBySize.has(r.size)) rowsBySize.set(r.size, []);
      rowsBySize.get(r.size)!.push(r);
    }
    const stylesSizesFromInventory = [...inventoryByStyleSize.keys()]
      .filter((k) => k.startsWith(`${style}__`))
      .map((k) => k.slice(style.length + 2));
    const allSizes = new Set<string>([...rowsBySize.keys(), ...stylesSizesFromInventory]);

    const sizes = [...allSizes].map((size) => {
      const sizeInventory = inventoryByStyleSize.get(`${style}__${size}`) ?? 0;
      return { size, ...deriveMetrics(rowsBySize.get(size) ?? [], rangeDays, sizeInventory) };
    });
    sizes.sort((a, b) => b.revenue - a.revenue || b.units - a.units);

    styles.push({ style, sizes, ...deriveMetrics(styleAdsRows, rangeDays, styleInventory) });
  }

  styles.sort((a, b) => b.revenue - a.revenue || b.units - a.units);
  return styles;
}

export function buildTotals(styles: StyleRow[]): Metrics {
  const flat = styles.map((s) => s);
  const units = flat.reduce((a, s) => a + s.units, 0);
  const revenue = flat.reduce((a, s) => a + s.revenue, 0);
  const spend = flat.reduce((a, s) => a + s.spend, 0);
  const impressions = flat.reduce((a, s) => a + s.impressions, 0);
  const clicks = flat.reduce((a, s) => a + s.clicks, 0);
  const drr = flat.reduce((a, s) => a + s.drr, 0);
  const inventory = flat.reduce((a, s) => a + s.inventory, 0);
  return {
    units,
    revenue,
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
    roas: spend > 0 ? revenue / spend : 0,
    cac: units > 0 ? spend / units : 0,
    drr,
    inventory,
    doh: drr > 0 ? inventory / drr : Infinity,
  };
}

export function buildTrend(adsRowsInRange: AdsRow[]) {
  const byDate = new Map<string, { units: number; revenue: number; spend: number }>();
  for (const r of adsRowsInRange) {
    const entry = byDate.get(r.date) ?? { units: 0, revenue: 0, spend: 0 };
    entry.units += r.units;
    entry.revenue += r.revenue;
    entry.spend += r.spend;
    byDate.set(r.date, entry);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date, ...v }));
}
