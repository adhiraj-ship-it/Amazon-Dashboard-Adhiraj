import { formatINR, formatNumber, formatPercent1 } from "@/lib/cpo/format";
import type { HeadlineSummary } from "@/lib/cpo/types";
import { ChannelLogo } from "./ChannelLogo";

function Cell({
  label,
  value,
  logo,
  emphasis,
}: {
  label: string;
  value: string;
  logo?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex min-w-[9rem] flex-1 flex-col gap-0.5 px-4 py-3">
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {logo && <ChannelLogo channel={logo} size={13} />}
        {label}
      </span>
      <span
        className={`tabular-nums ${
          emphasis ? "text-xl font-semibold text-slate-900 dark:text-slate-50" : "text-lg text-slate-800 dark:text-slate-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function HeadlineStrip({ headline }: { headline: HeadlineSummary | undefined }) {
  if (!headline) {
    return <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">No data for this month.</div>;
  }
  return (
    <div className="flex flex-wrap divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900 sm:divide-x">
      <Cell label="Total Dispatches" value={formatNumber(headline.totalDispatches)} />
      <Cell label="Total Cost" value={formatINR(headline.totalCost)} />
      <Cell label="Units Moved" value={formatNumber(headline.unitsMoved)} />
      <Cell label="Amazon CPO" value={formatINR(headline.amazonCpo)} logo="Amazon" emphasis />
      <Cell label="Myntra CPO" value={formatINR(headline.myntraCpo)} logo="Myntra" emphasis />
      <Cell label="Cost % of Invoice Value" value={formatPercent1(headline.costPctOfInvoiceValue)} emphasis />
    </div>
  );
}
