import type { Brand } from "./config";

export interface AdsRow {
  brand: Brand;
  date: string; // ISO yyyy-mm-dd
  style: string;
  size: string;
  color: string;
  spend: number;
  units: number;
  impressions: number;
  clicks: number;
  revenue: number;
}

export interface InventoryRow {
  brand: Brand;
  style: string;
  size: string;
  color: string;
  units: number;
}

export interface Metrics {
  units: number;
  revenue: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number; // clicks / impressions
  roas: number; // revenue / spend
  cac: number; // spend / units
  drr: number; // avg units per day over the selected range
  inventory: number;
  doh: number; // inventory / drr
}

export interface SizeRow extends Metrics {
  size: string;
}

export interface StyleRow extends Metrics {
  style: string;
  sizes: SizeRow[];
}

export interface DashboardData {
  brand: Brand;
  asOf: string | null; // inventory snapshot date label
  rangeStart: string;
  rangeEnd: string;
  dataMinDate: string;
  dataMaxDate: string;
  totals: Metrics;
  styles: StyleRow[];
  trend: { date: string; units: number; revenue: number; spend: number }[];
  fetchedAt: string;
}
