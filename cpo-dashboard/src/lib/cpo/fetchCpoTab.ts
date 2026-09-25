import Papa from "papaparse";
import { CPO_SHEET_ID } from "./config";

/**
 * Fetches a tab from the CPO Tracker sheet via public CSV export.
 *
 * Deliberately independent of `../googleSheets.ts` (the Amazon ads
 * dashboard's fetcher): that module prefers the authenticated Sheets API
 * when service-account creds are present, but this sheet is a separate,
 * link-shared workbook that the service account isn't necessarily granted
 * access to. CSV export works for any "anyone with the link can view"
 * sheet with no auth at all, so we always use it here.
 */
export async function fetchCpoTab(gid: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${CPO_SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch CPO sheet tab (gid=${gid}): ${res.status}`);
  }
  const text = await res.text();
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  return parsed.data;
}
