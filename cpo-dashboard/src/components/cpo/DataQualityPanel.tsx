import { formatNumber, formatPercent } from "@/lib/cpo/format";
import type { DataQuality } from "@/lib/cpo/types";

export function DataQualityPanel({ dq, hasGlobalPoolRate }: { dq: DataQuality; hasGlobalPoolRate: boolean }) {
  const matchRate = dq.soldRowsTotal > 0 ? dq.soldRowsWithDispatchMatch / dq.soldRowsTotal : 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Data Quality Notes</h3>
      <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
        <li>
          {formatNumber(dq.droppedJunkRows)} blank/template rows were dropped from Master Tracker (no invoice number or status) out
          of {formatNumber(dq.totalMasterTrackerRows)} total.
        </li>
        <li>
          {formatNumber(dq.cancelledRows)} cancelled invoice lines were excluded from sold units and cost entirely.
        </li>
        <li>
          Of {formatNumber(dq.soldRowsTotal)} sold invoice lines in scope, {formatNumber(dq.soldRowsWithDispatchMatch)} (
          {formatPercent(matchRate)}) matched a dispatch record in Working RCA — the rest have no cost data available yet and show
          up as reduced coverage rather than zero cost.
        </li>
        {dq.dispatchLinkMismatch > 0 && (
          <li>
            {formatNumber(dq.dispatchLinkMismatch)} sold lines reference a dispatch number that wasn&apos;t found in Working RCA
            (likely a typo or a dispatch not yet logged there).
          </li>
        )}
        {dq.unclassifiedLegRows > 0 && (
          <li>
            {formatNumber(dq.unclassifiedLegRows)} matched lines couldn&apos;t be classified as direct/warehouse-to-channel/global-pool
            from SOURCE, DESTINATION, and WH Location — shown under &quot;Unclassified&quot; rather than guessed into a channel.
          </li>
        )}
        {!hasGlobalPoolRate && (
          <li className="text-amber-700 dark:text-amber-400">
            No global-pool (factory→warehouse / warehouse→warehouse) cost data matched this period yet, so first-mile allocation is
            ₹0 for now — it will populate once those dispatches accumulate.
          </li>
        )}
        <li>
          Detention and unloading charges are typically booked a few weeks after freight, so very recent dispatches may show ₹0 for
          those lines until Finance closes them out — this is expected, not a data error.
        </li>
      </ul>
    </div>
  );
}
