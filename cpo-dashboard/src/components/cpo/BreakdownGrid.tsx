"use client";

import { Fragment, useState } from "react";
import { formatINR, formatNumber, formatPercent1 } from "@/lib/cpo/format";
import type { BreakdownBrandCell, BreakdownTable } from "@/lib/cpo/types";
import { ChannelLogo } from "./ChannelLogo";

const TINT: Record<string, string> = {
  Amazon: "bg-amber-50/70 dark:bg-amber-950/20",
  Myntra: "bg-rose-50/70 dark:bg-rose-950/20",
  Global: "bg-teal-50/70 dark:bg-teal-950/20",
  Overall: "bg-slate-100/80 dark:bg-slate-800/40",
};

type Mode = "units" | "pct";

export function BreakdownGrid({
  table,
  rowHeader,
  note,
  showCpo = false,
}: {
  table: BreakdownTable | undefined;
  rowHeader: string;
  note?: string;
  /** Zone adds CPO per cell, so you can read cost by channel × brand × zone. */
  showCpo?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("units");

  if (!table || table.rows.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        No data for this month.
      </div>
    );
  }

  const brandsFor = (col: string) => (table.brandUnavailableColumns.includes(col) ? [] : table.brands);
  const subColsFor = (col: string) => brandsFor(col).length + 1; // brands + Total
  const spanFor = (col: string) => subColsFor(col) * (showCpo ? 2 : 1);

  const primary = (cell: BreakdownBrandCell, unavailable: boolean) => {
    if (unavailable) return "n/a";
    if (cell.units === 0) return "–";
    return mode === "pct" ? formatPercent1(cell.pct) : formatNumber(cell.units);
  };

  const toggleBtn = (m: Mode) =>
    `rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
      mode === m
        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
        : "text-slate-600 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-800"
    }`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-end gap-1 border-b border-slate-100 px-3 py-1.5 dark:border-slate-800/60">
        <span className="mr-1 text-[11px] uppercase tracking-wide text-slate-400">Show</span>
        <div className="flex gap-1 rounded-md bg-slate-100 p-0.5 dark:bg-slate-800/60">
          <button onClick={() => setMode("units")} className={toggleBtn("units")}>
            Units
          </button>
          <button onClick={() => setMode("pct")} className={toggleBtn("pct")}>
            %
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900">
                {rowHeader}
              </th>
              {table.columns.map((col) => (
                <th
                  key={col}
                  colSpan={spanFor(col)}
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
              <th className="sticky left-0 z-10 bg-white dark:bg-slate-900" />
              {table.columns.map((col) => (
                <Fragment key={col}>
                  {[...brandsFor(col), "Total"].map((label, i) => (
                    <Fragment key={label}>
                      <th
                        className={`whitespace-nowrap px-3 py-1 text-right text-[11px] uppercase tracking-wide ${
                          label === "Total" ? "font-semibold text-slate-700 dark:text-slate-200" : "font-medium text-slate-500"
                        } ${i === 0 ? "border-l border-slate-200 dark:border-slate-700" : ""} ${TINT[col] ?? ""}`}
                      >
                        {label}
                      </th>
                      {showCpo && (
                        <th
                          className={`whitespace-nowrap px-3 py-1 text-right text-[11px] font-medium uppercase tracking-wide text-slate-400 ${TINT[col] ?? ""}`}
                        >
                          CPO
                        </th>
                      )}
                    </Fragment>
                  ))}
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr
                key={row.label}
                className={`border-b border-slate-100 last:border-0 dark:border-slate-800/60 ${
                  row.isTotal ? "border-t-2 border-t-slate-300 font-semibold dark:border-t-slate-600" : ""
                }`}
              >
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {row.label}
                </td>
                {table.columns.map((col) => {
                  const unavailable = table.unavailableColumns.includes(col);
                  const cell = row.cells[col];
                  const entries: [string, BreakdownBrandCell][] = [
                    ...brandsFor(col).map((b) => [b, cell?.byBrand[b] ?? { units: 0, cost: 0, pct: 0, cpo: 0 }] as [string, BreakdownBrandCell]),
                    ["Total", cell ?? { units: 0, cost: 0, pct: 0, cpo: 0 }],
                  ];
                  return (
                    <Fragment key={col}>
                      {entries.map(([label, c], i) => (
                        <Fragment key={label}>
                          <td
                            className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${
                              i === 0 ? "border-l border-slate-100 dark:border-slate-800/60" : ""
                            } ${label === "Total" ? "font-medium text-slate-800 dark:text-slate-200" : "text-slate-700 dark:text-slate-300"} ${
                              unavailable || c.units === 0 ? "text-slate-400" : ""
                            }`}
                          >
                            {primary(c, unavailable)}
                          </td>
                          {showCpo && (
                            <td
                              className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${
                                unavailable || c.units === 0 ? "text-slate-400" : "text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {unavailable || c.units === 0 ? "–" : formatINR(c.cpo)}
                            </td>
                          )}
                        </Fragment>
                      ))}
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(note || table.unavailableColumns.length > 0) && (
        <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500 dark:border-slate-800/60">
          {note}
          {table.unavailableColumns.length > 0 &&
            ` ${table.unavailableColumns.join(", ")} shows "n/a" — Working RCA records only Style for those dispatches, never Size.`}
        </p>
      )}
    </div>
  );
}
