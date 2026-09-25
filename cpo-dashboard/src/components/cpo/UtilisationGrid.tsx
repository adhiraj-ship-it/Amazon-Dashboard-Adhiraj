import { Fragment } from "react";
import { formatNumber, formatPercent1 } from "@/lib/cpo/format";
import type { UtilisationTable } from "@/lib/cpo/types";
import { ChannelLogo } from "./ChannelLogo";

const TINT: Record<string, string> = {
  Amazon: "bg-amber-50/70 dark:bg-amber-950/20",
  Myntra: "bg-rose-50/70 dark:bg-rose-950/20",
  Global: "bg-teal-50/70 dark:bg-teal-950/20",
  Overall: "bg-slate-100/80 dark:bg-slate-800/40",
};

/** Under ~70% is worth a look — that's a truck paying full freight for a part load. */
function tone(pct: number): string {
  if (pct >= 0.85) return "text-emerald-700 dark:text-emerald-400";
  if (pct >= 0.7) return "text-amber-700 dark:text-amber-400";
  return "text-rose-700 dark:text-rose-400";
}

export function UtilisationGrid({ table }: { table: UtilisationTable | undefined }) {
  if (!table) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        No data for this month.
      </div>
    );
  }

  const anyMissingCapacity = table.rows.some((r) => !r.cells[table.columns[0]]?.capacityKnown);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Truck</th>
            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Capacity</th>
            {table.columns.map((col) => (
              <th
                key={col}
                colSpan={2}
                className={`border-l border-slate-200 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:text-slate-200 ${TINT[col] ?? ""}`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ChannelLogo channel={col} size={14} />
                  {col}
                </span>
              </th>
            ))}
          </tr>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th />
            <th />
            {table.columns.map((col) => (
              <Fragment key={col}>
                <th
                  key={`${col}-t`}
                  className={`whitespace-nowrap border-l border-slate-200 px-3 py-1 text-right text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 ${TINT[col] ?? ""}`}
                >
                  Trips
                </th>
                <th
                  key={`${col}-u`}
                  className={`whitespace-nowrap px-3 py-1 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200 ${TINT[col] ?? ""}`}
                >
                  Utilisation
                </th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.truck} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
              <td className="whitespace-nowrap px-3 py-1.5 text-slate-700 dark:text-slate-300">{row.truck}</td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-slate-400">
                {row.capacityPerTruck > 0 ? formatNumber(row.capacityPerTruck) : "—"}
              </td>
              {table.columns.map((col) => {
                const c = row.cells[col];
                return (
                  <Fragment key={col}>
                    <td
                      key={`${col}-t`}
                      className="whitespace-nowrap border-l border-slate-100 px-3 py-1.5 text-right tabular-nums text-slate-600 dark:border-slate-800/60 dark:text-slate-400"
                    >
                      {c && c.dispatches > 0 ? formatNumber(c.dispatches) : "–"}
                    </td>
                    <td
                      key={`${col}-u`}
                      className={`whitespace-nowrap px-3 py-1.5 text-right font-medium tabular-nums ${
                        !c || !c.capacityKnown || c.dispatches === 0 ? "text-slate-400" : tone(c.pct)
                      }`}
                    >
                      {!c || c.dispatches === 0 ? "–" : !c.capacityKnown ? "n/a" : formatPercent1(c.pct)}
                    </td>
                  </Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500 dark:border-slate-800/60">
        Goods volume carried ÷ usable truck volume, summed across trips rather than averaging each trip&apos;s percentage — so a
        part-loaded small truck can&apos;t offset a full large one.
        {anyMissingCapacity && " Trucks with no capacity on file in the VEHICLE reference show n/a rather than a guess."}
      </p>
    </div>
  );
}
