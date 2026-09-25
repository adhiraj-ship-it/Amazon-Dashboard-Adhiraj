import { BRAND_PREFIX_MAP, SIZE_BAND_LABELS } from "./config";
import type { MasterTrackerRow, WorkingRcaRow } from "./types";

/** Strips currency symbols/commas and coerces "NA"/"#N/A"/"" to 0. */
export function toNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₹,\s]/g, "");
  if (!cleaned || cleaned === "NA" || cleaned === "#N/A" || cleaned === "-") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** "25/04/2025" -> "2025-04-25". Returns "" if unparseable. */
export function ddmmyyyyToIso(raw: string | undefined): string {
  if (!raw) return "";
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** Master Tracker's "Invoice date" is already ISO; just validate it. */
export function asIsoDate(raw: string | undefined): string {
  if (!raw) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(raw.trim()) ? raw.trim() : "";
}

export function deriveBrandFromSku(skuCode: string): string {
  const prefix = skuCode.trim().slice(0, 2).toUpperCase();
  return BRAND_PREFIX_MAP[prefix] ?? (prefix || "Unknown");
}

/** Normalizes messy size labels ("CABIN", "Cabin", "3Pc Set", "3PC SET"...) to a canonical band. */
export function normalizeSizeBand(raw: string): string {
  const key = raw.trim().toUpperCase();
  return SIZE_BAND_LABELS[key] ?? (raw.trim() || "Unknown");
}

function indexHeader(header: string[], name: string): number {
  return header.indexOf(name);
}

/** "Vehicle Type" and a few others appear twice in Working RCA; the classification block (near Movement Type/WH Type) is the LAST occurrence. */
function lastIndexHeader(header: string[], name: string): number {
  return header.lastIndexOf(name);
}

export function parseWorkingRca(rows: string[][]): WorkingRcaRow[] {
  if (rows.length === 0) return [];
  const header = rows[0];
  const col = {
    dispatchNo: indexHeader(header, "Dispatch No"),
    plant: indexHeader(header, "Plant"),
    whLocation: indexHeader(header, "WH Location"),
    dispatchDate: indexHeader(header, "Dispatch Date"),
    invoiceDate: indexHeader(header, "Invoice Date"),
    source: indexHeader(header, "SOURCE"),
    destination: indexHeader(header, "DESTINATION"),
    category: indexHeader(header, "Catagory"),
    style: indexHeader(header, "Style"),
    netSupplied: indexHeader(header, "Net Supplied"),
    vehicleType: lastIndexHeader(header, "Vehicle Type"),
    movementType: indexHeader(header, "Movement Type"),
    zone: indexHeader(header, "Zone"),
    detentionLoading: indexHeader(header, "Detention Charges\n(Loading Point)"),
    unloadingCharges: indexHeader(header, "Unloading Charges"),
    freightCharges: indexHeader(header, "Freight Charges"),
    detentionUnloading: indexHeader(header, "Detention Charges\n(Unloading Point)"),
    returnCharges: indexHeader(header, "Return Charges / Addtional caharges"),
  };

  const out: WorkingRcaRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dispatchNo = row[col.dispatchNo]?.trim();
    if (!row || row.length < 5 || !dispatchNo) continue;
    out.push({
      dispatchNo,
      plant: row[col.plant]?.trim() ?? "",
      whLocation: row[col.whLocation]?.trim() ?? "",
      dispatchDate: ddmmyyyyToIso(row[col.dispatchDate]),
      invoiceDate: ddmmyyyyToIso(row[col.invoiceDate]),
      source: row[col.source]?.trim() ?? "",
      destination: row[col.destination]?.trim() ?? "",
      category: row[col.category]?.trim() ?? "",
      style: row[col.style]?.trim() ?? "",
      netSupplied: toNumber(row[col.netSupplied]),
      vehicleType: row[col.vehicleType]?.trim() ?? "",
      movementType: row[col.movementType]?.trim() ?? "",
      zone: row[col.zone]?.trim() ?? "",
      detentionLoading: toNumber(row[col.detentionLoading]),
      unloadingCharges: toNumber(row[col.unloadingCharges]),
      freightCharges: toNumber(row[col.freightCharges]),
      detentionUnloading: toNumber(row[col.detentionUnloading]),
      returnCharges: toNumber(row[col.returnCharges]),
    });
  }
  return out;
}

export function parseMasterTracker(rows: string[][]): MasterTrackerRow[] {
  if (rows.length === 0) return [];
  const header = rows[0];
  const col = {
    invoiceDate: indexHeader(header, "Invoice date"),
    invoiceNo: indexHeader(header, "Invoice No"),
    invoiceStatus: indexHeader(header, "Invoice Status"),
    invoiceType: indexHeader(header, "Invoice Type"),
    customerName: indexHeader(header, "Customer Name"),
    skuCode: indexHeader(header, "SKU Code"),
    itemName: indexHeader(header, "Item Name"),
    quantity: indexHeader(header, "Quantity"),
    rejectedQty: indexHeader(header, "Rejected Qty"),
    finalQty: indexHeader(header, "Final Qty"),
    style: indexHeader(header, "Style"),
    size: indexHeader(header, "Size"),
    channel: indexHeader(header, "Channel"),
    dispatchNo: indexHeader(header, "Dispatch"),
    prodVol: indexHeader(header, "Prod Vol"),
    invoiceValue: indexHeader(header, "Total After Rejections"),
  };

  const out: MasterTrackerRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;
    const invoiceNo = row[col.invoiceNo]?.trim() ?? "";
    const invoiceStatus = row[col.invoiceStatus]?.trim() ?? "";
    // Drop junk/template rows: no invoice number and no status at all.
    if (!invoiceNo && !invoiceStatus) continue;
    out.push({
      invoiceDate: asIsoDate(row[col.invoiceDate]),
      invoiceNo,
      invoiceStatus,
      invoiceType: row[col.invoiceType]?.trim() ?? "",
      customerName: row[col.customerName]?.trim() ?? "",
      skuCode: row[col.skuCode]?.trim() ?? "",
      itemName: row[col.itemName]?.trim() ?? "",
      quantity: toNumber(row[col.quantity]),
      rejectedQty: toNumber(row[col.rejectedQty]),
      finalQty: toNumber(row[col.finalQty]),
      style: row[col.style]?.trim() ?? "",
      size: row[col.size]?.trim() ?? "",
      channel: row[col.channel]?.trim() ?? "",
      dispatchNo: row[col.dispatchNo]?.trim() ?? "",
      prodVol: toNumber(row[col.prodVol]),
      invoiceValue: toNumber(row[col.invoiceValue]),
    });
  }
  return out;
}
