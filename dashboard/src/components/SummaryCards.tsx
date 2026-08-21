import type { Metrics } from "@/lib/types";
import { formatCurrency, formatDays, formatNumber, formatPercent, formatRatio } from "@/lib/format";

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}

export function SummaryCards({ totals }: { totals: Metrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Card label="Secondary Sales" value={formatCurrency(totals.revenue)} sub={`${formatNumber(totals.units)} units`} />
      <Card label="DRR" value={`${formatNumber(totals.drr, 1)} u/day`} />
      <Card label="Ad Spend" value={formatCurrency(totals.spend)} />
      <Card label="ROAS" value={formatRatio(totals.roas)} />
      <Card label="CAC" value={formatCurrency(totals.cac)} />
      <Card label="Impressions" value={formatNumber(totals.impressions)} />
      <Card label="Clicks / CTR" value={formatNumber(totals.clicks)} sub={formatPercent(totals.ctr)} />
      <Card label="Inventory" value={formatNumber(totals.inventory)} sub="units on hand" />
      <Card label="DOH" value={formatDays(totals.doh)} sub="at current DRR" />
    </div>
  );
}
