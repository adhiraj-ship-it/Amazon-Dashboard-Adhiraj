import Papa from "papaparse";
import { SHEET_ID } from "./config";

interface TabRef {
  gid: string;
  title: string;
}

function hasServiceAccountCreds() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
  );
}

async function fetchViaApi(title: string): Promise<string[][]> {
  // Loaded lazily so `googleapis` is never bundled/required for the CSV
  // fallback path (used in local dev against the link-shared sheet).
  const { google } = await import("googleapis");
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: title,
  });
  return (res.data.values as string[][]) ?? [];
}

async function fetchViaCsvExport(gid: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet tab (gid=${gid}): ${res.status}`);
  }
  const text = await res.text();
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  return parsed.data;
}

export async function fetchTab(ref: TabRef): Promise<string[][]> {
  if (hasServiceAccountCreds()) {
    return fetchViaApi(ref.title);
  }
  return fetchViaCsvExport(ref.gid);
}
