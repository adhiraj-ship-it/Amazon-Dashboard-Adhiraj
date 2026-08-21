import type { Brand } from "./config";
import type { AdsRow, InventoryRow } from "./types";

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/**
 * Parses "yyyy-mm-dd" and "D MMM YYYY" (e.g. "18 Aug 2026") into an ISO date
 * string, without ever constructing a `Date` object. `new Date("18 Aug 2026")`
 * is parsed as *local* midnight (non-ISO formats aren't spec-guaranteed UTC),
 * so a later `.toISOString()` shifts the date backward by a day for any
 * positive UTC-offset timezone (e.g. IST) — this sidesteps that entirely.
 */
function toIsoDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const longMatch = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/.exec(trimmed);
  if (longMatch) {
    const [, day, monthName, year] = longMatch;
    const month = MONTHS[monthName.slice(0, 3).toLowerCase()];
    if (!month) return null;
    return `${year}-${month}-${day.padStart(2, "0")}`;
  }

  return null;
}

function toNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₹,\s]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

const SIZE_ALIASES: Record<string, string> = {
  "cabin": "Cabin",
  "medium": "Medium",
  "large": "Large",
  "2pc set": "2Pc Set",
  "3pc set": "3Pc Set",
  "one size": "Cabin", // bags are tagged with a placeholder size in this catalog
};

function normalizeSize(raw: string): string {
  const key = raw.trim().toLowerCase();
  return SIZE_ALIASES[key] ?? raw.trim();
}

function normalizeText(raw: string | undefined): string {
  return (raw ?? "").trim();
}

/** Parses a "Snitch Data" / "Rare Data" tab: Date,P,S,C,Spends,Units,Impressions,Clicks,Ordered Revenue */
export function parseAdsRows(rawRows: string[][], brand: Brand): AdsRow[] {
  const rows: AdsRow[] = [];
  for (const row of rawRows) {
    const [dateRaw, styleRaw, sizeRaw, colorRaw, spendRaw, unitsRaw, impressionsRaw, clicksRaw, revenueRaw] = row;
    const date = toIsoDate(dateRaw ?? "");
    const style = normalizeText(styleRaw);
    if (!date || !style) continue; // skips header row and any blank lines
    rows.push({
      brand,
      date,
      style,
      size: normalizeSize(sizeRaw ?? ""),
      color: normalizeText(colorRaw),
      spend: toNumber(spendRaw),
      units: toNumber(unitsRaw),
      impressions: toNumber(impressionsRaw),
      clicks: toNumber(clicksRaw),
      revenue: toNumber(revenueRaw),
    });
  }
  return rows;
}

/**
 * Parses an "Inventory_Aug_*" tab. Layout is:
 *   row 0: blank
 *   row 1: ["", "Inventory at end of <date>", "", "", ""]
 *   row 2: ["", "Product", "Size", "Colour", "Sellable On Hand Units"]
 *   row 3+: ["", <style>, <size>, <color>, <units>]
 * A stray duplicate-header row (style === "Product") can appear and is skipped.
 */
export function parseInventoryRows(
  rawRows: string[][],
  brand: Brand
): { rows: InventoryRow[]; asOf: string | null } {
  let asOf: string | null = null;
  const rows: InventoryRow[] = [];

  for (const row of rawRows) {
    const label = row[1] ?? "";
    const match = /inventory at end of (.+)/i.exec(label);
    if (match) {
      asOf = toIsoDate(match[1]) ?? match[1].trim();
      continue;
    }

    const style = normalizeText(row[1]);
    const size = normalizeText(row[2]);
    const color = normalizeText(row[3]);
    const unitsRaw = row[4];
    if (!style || style === "Product" || size === "Size") continue;

    const units = toNumber(unitsRaw);
    if (!Number.isFinite(units)) continue;

    rows.push({ brand, style, size: normalizeSize(size), color, units });
  }

  return { rows, asOf };
}
