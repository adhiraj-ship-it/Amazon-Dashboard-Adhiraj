import Papa from "papaparse";
import { CPO_SHEET_ID, OVERRIDES_TAB_NAME } from "./config";

/**
 * Manual inputs that sit on top of the sheet data, read from a tab in the same
 * workbook so the whole team shares one source of truth (and edits it where
 * they already work) rather than each browser holding its own copy.
 *
 * Expected tab layout — one header row, then one row per value:
 *   Month   | Type           | Channel | Value
 *   2026-09 | First Mile CPO |         | 55
 *   2026-09 | Adjustment %   | Amazon  | 10
 */
export interface Overrides {
  /** monthKey -> rupees per unit to allocate as first mile. Absent = use the computed pool rate. */
  firstMileCpo: Record<string, number>;
  /** monthKey -> channel -> fraction (0.1 = +10%). Absent = 0. */
  adjustmentFactor: Record<string, Record<string, number>>;
}

export const EMPTY_OVERRIDES: Overrides = { firstMileCpo: {}, adjustmentFactor: {} };

export interface OverridesResult {
  overrides: Overrides;
  /** False when the tab is missing or doesn't have the expected columns. */
  tabFound: boolean;
  /** Rows the sheet had that couldn't be understood, surfaced rather than silently ignored. */
  skippedRows: string[];
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Accepts "2026-09", "Sept 2026", "September 2026", "09/2026". Returns "" if unparseable. */
export function normalizeMonthKey(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, "0")}`;
  m = s.match(/^([A-Za-z]{3,})\.?\s+(\d{4})$/);
  if (m) {
    const idx = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    if (idx >= 0) return `${m[2]}-${String(idx + 1).padStart(2, "0")}`;
  }
  return "";
}

function columnIndex(header: string[], ...candidates: string[]): number {
  const normalized = header.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const i = normalized.indexOf(c.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

export function parseOverrides(rows: string[][]): OverridesResult {
  const empty: OverridesResult = { overrides: { firstMileCpo: {}, adjustmentFactor: {} }, tabFound: false, skippedRows: [] };
  if (rows.length === 0) return empty;

  const header = rows[0] ?? [];
  const iMonth = columnIndex(header, "month");
  const iType = columnIndex(header, "type");
  const iChannel = columnIndex(header, "channel");
  const iValue = columnIndex(header, "value");

  // Requesting a tab that doesn't exist returns the workbook's FIRST tab with a
  // 200, so a header that doesn't match means "no overrides tab", not "empty".
  if (iMonth < 0 || iType < 0 || iValue < 0) return empty;

  const overrides: Overrides = { firstMileCpo: {}, adjustmentFactor: {} };
  const skippedRows: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const rawMonth = (row[iMonth] ?? "").trim();
    const rawType = (row[iType] ?? "").trim();
    const rawValue = (row[iValue] ?? "").trim();
    if (!rawMonth && !rawType && !rawValue) continue;

    const monthKey = normalizeMonthKey(rawMonth);
    const value = Number(rawValue.replace(/[₹,%\s]/g, ""));
    const type = rawType.toLowerCase();

    if (!monthKey || !Number.isFinite(value) || !rawValue) {
      skippedRows.push(`Row ${i + 1}: month "${rawMonth}", type "${rawType}", value "${rawValue}"`);
      continue;
    }

    if (type.includes("first mile")) {
      overrides.firstMileCpo[monthKey] = value;
    } else if (type.includes("adjust")) {
      const channel = (row[iChannel] ?? "").trim();
      if (!channel) {
        skippedRows.push(`Row ${i + 1}: adjustment with no channel`);
        continue;
      }
      overrides.adjustmentFactor[monthKey] = {
        ...(overrides.adjustmentFactor[monthKey] ?? {}),
        // Entered as a percentage; stored as a fraction.
        [channel]: value / 100,
      };
    } else {
      skippedRows.push(`Row ${i + 1}: unrecognised type "${rawType}"`);
    }
  }

  return { overrides, tabFound: true, skippedRows };
}

export async function readOverrides(): Promise<OverridesResult> {
  const url = `https://docs.google.com/spreadsheets/d/${CPO_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    OVERRIDES_TAB_NAME
  )}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return { overrides: EMPTY_OVERRIDES, tabFound: false, skippedRows: [] };
    const text = await res.text();
    return parseOverrides(Papa.parse<string[]>(text, { skipEmptyLines: false }).data);
  } catch {
    return { overrides: EMPTY_OVERRIDES, tabFound: false, skippedRows: [] };
  }
}
