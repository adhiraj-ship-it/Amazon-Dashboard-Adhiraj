"use client";

import { useState } from "react";
import { CPO_ACCENT } from "@/lib/cpo/accent";
import { formatINR, formatMonth, formatNumber } from "@/lib/cpo/format";
import type { GlobalPoolMonthSummary } from "@/lib/cpo/types";

export function GlobalPoolPanel({ pool }: { pool: GlobalPoolMonthSummary[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(monthKey: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  }

  if (pool.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        No first-mile pool data yet — no Factory→Warehouse or Warehouse→Warehouse dispatches matched this period, so first-mile
        allocation is ₹0 everywhere.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pool.map((p) => {
        const isOpen = expanded.has(p.monthKey);
        return (
          <div key={p.monthKey} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => toggle(p.monthKey)}
              className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <span className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                <span className={`transition-transform ${isOpen ? "rotate-90" : ""} text-slate-400`}>›</span>
                {formatMonth(p.monthKey)}
              </span>
              <span className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                <span>
                  Pool cost: <b className="tabular-nums text-slate-900 dark:text-slate-100">{formatINR(p.totalCost)}</b>
                </span>
                <span>
                  Pool volume: <b className="tabular-nums text-slate-900 dark:text-slate-100">{p.totalVolume.toFixed(1)}</b>
                </span>
                <span>
                  Rate:{" "}
                  <b className="tabular-nums text-slate-900 dark:text-slate-100">
                    {formatINR(p.rate)}/volume-unit
                  </b>
                </span>
                <span>{p.dispatches.length} dispatches</span>
              </span>
            </button>
            {isOpen && (
              <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800/60">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className={`border-b text-left uppercase tracking-wide ${CPO_ACCENT.headerRow} ${CPO_ACCENT.headerText}`}>
                      <th className="px-3 py-1.5 font-medium">Dispatch</th>
                      <th className="px-3 py-1.5 font-medium">Invoice Date</th>
                      <th className="px-3 py-1.5 font-medium">Source → Destination</th>
                      <th className="px-3 py-1.5 font-medium">Style</th>
                      <th className="px-3 py-1.5 text-right font-medium">Net Supplied</th>
                      <th className="px-3 py-1.5 text-right font-medium">Volume Weight</th>
                      <th className="px-3 py-1.5 text-right font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.dispatches.map((d) => (
                      <tr key={d.dispatchNo} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                        <td className="whitespace-nowrap px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200">
                          {d.dispatchNo}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-slate-600 dark:text-slate-400">{d.invoiceDate}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-slate-600 dark:text-slate-400">
                          {d.source} → {d.destination || d.whLocation}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-slate-600 dark:text-slate-400">{d.style}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{formatNumber(d.netSupplied)}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{d.volumeWeight.toFixed(1)}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{formatINR(d.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
