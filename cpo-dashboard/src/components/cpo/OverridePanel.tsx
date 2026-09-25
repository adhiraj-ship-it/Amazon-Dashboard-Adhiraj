import { formatINR, formatMonth } from "@/lib/cpo/format";
import type { Overrides } from "@/lib/cpo/overrides";
import type { FirstMileRateSource } from "@/lib/cpo/types";

const CHANNELS = ["Amazon", "Myntra"];

export function OverridePanel({
  overrides,
  months,
  firstMileRates,
  tabFound,
  skippedRows,
  tabName,
  sheetUrl,
}: {
  overrides: Overrides;
  months: string[];
  firstMileRates: FirstMileRateSource[];
  tabFound: boolean;
  skippedRows: string[];
  tabName: string;
  sheetUrl: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Entered in the sheet</h3>
            <p className="mt-1 max-w-3xl text-xs text-slate-500">
              These come from the <b>{tabName}</b> tab of the CPO Tracker workbook, so everyone sees the same numbers. Edit
              there and hit Refresh here — values reload within a minute.
            </p>
          </div>
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Open sheet ↗
          </a>
        </div>

        {!tabFound && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            <p className="font-medium">No “{tabName}” tab found — every month is using its computed rate and 0% adjustment.</p>
            <p className="mt-1">Add a tab named exactly <b>{tabName}</b> with these four columns in row 1:</p>
            <table className="mt-2 border-collapse text-[11px]">
              <thead>
                <tr className="text-left">
                  {["Month", "Type", "Channel", "Value"].map((h) => (
                    <th key={h} className="border border-amber-300 px-2 py-1 dark:border-amber-800">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr>
                  <td className="border border-amber-300 px-2 py-1 dark:border-amber-800">2026-09</td>
                  <td className="border border-amber-300 px-2 py-1 dark:border-amber-800">First Mile CPO</td>
                  <td className="border border-amber-300 px-2 py-1 dark:border-amber-800" />
                  <td className="border border-amber-300 px-2 py-1 dark:border-amber-800">55</td>
                </tr>
                <tr>
                  <td className="border border-amber-300 px-2 py-1 dark:border-amber-800">2026-09</td>
                  <td className="border border-amber-300 px-2 py-1 dark:border-amber-800">Adjustment %</td>
                  <td className="border border-amber-300 px-2 py-1 dark:border-amber-800">Amazon</td>
                  <td className="border border-amber-300 px-2 py-1 dark:border-amber-800">10</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2">
              First Mile CPO is ₹ per unit and leaves Channel blank. Adjustment is a percentage for one channel. Month also
              accepts “Sept 2026” or “09/2026”.
            </p>
          </div>
        )}

        {skippedRows.length > 0 && (
          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            <p className="font-medium">{skippedRows.length} row(s) in the sheet couldn&apos;t be read and were ignored:</p>
            <ul className="mt-1 list-inside list-disc">
              {skippedRows.slice(0, 5).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">First Mile CPO allocated</h3>
        <p className="mt-1 text-xs text-slate-500">
          The pool cost booked in a month may belong to stock that moved earlier, so the allocated figure can be set by hand.
          It&apos;s still spread volumetrically — a Large absorbs more than a Cabin — but the month&apos;s average lands exactly on
          the entered number.
        </p>
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1 font-medium">Month</th>
              <th className="py-1 text-right font-medium">Computed</th>
              <th className="py-1 text-right font-medium">Applied</th>
              <th className="py-1 text-right font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {firstMileRates.map((r) => (
              <tr key={r.monthKey} className="border-t border-slate-100 dark:border-slate-800/60">
                <td className="py-1 text-slate-700 dark:text-slate-300">{formatMonth(r.monthKey)}</td>
                <td className="py-1 text-right tabular-nums text-slate-500">{formatINR(r.computedCpoPerUnit)}</td>
                <td className="py-1 text-right font-medium tabular-nums text-slate-900 dark:text-slate-100">
                  {formatINR(r.appliedCpoPerUnit)}
                </td>
                <td className="py-1 text-right">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      r.manual
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {r.manual ? "From sheet" : "Computed"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Adjustment factor by channel</h3>
        <p className="mt-1 text-xs text-slate-500">
          Lifts that channel&apos;s CPO in the Ecom tab for the month. It&apos;s added as its own cost line, so Total Cost ÷ Units
          still equals the CPO shown. Unset months are 0%.
        </p>
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1 font-medium">Month</th>
              {CHANNELS.map((c) => (
                <th key={c} className="py-1 text-right font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m} className="border-t border-slate-100 dark:border-slate-800/60">
                <td className="py-1 text-slate-700 dark:text-slate-300">{formatMonth(m)}</td>
                {CHANNELS.map((c) => {
                  const f = overrides.adjustmentFactor[m]?.[c] ?? 0;
                  return (
                    <td
                      key={c}
                      className={`py-1 text-right tabular-nums ${f ? "font-medium text-slate-900 dark:text-slate-100" : "text-slate-400"}`}
                    >
                      {f ? `${(f * 100).toFixed(1)}%` : "0%"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
