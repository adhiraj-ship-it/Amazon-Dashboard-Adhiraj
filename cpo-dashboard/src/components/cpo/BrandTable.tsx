"use client";

import { Fragment, useState } from "react";
import { CPO_ACCENT } from "@/lib/cpo/accent";
import { formatINR, formatNumber } from "@/lib/cpo/format";
import type { BrandMonthSummary, BrandSizeBandSummary } from "@/lib/cpo/types";

export function BrandTable({
  rows,
  sizeBand,
}: {
  rows: BrandMonthSummary[];
  sizeBand: BrandSizeBandSummary[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        No data for this month.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="min-w-full text-sm">
        <thead>
          <tr className={`border-b text-left text-xs uppercase tracking-wide ${CPO_ACCENT.headerRow} ${CPO_ACCENT.headerText}`}>
            <th className="px-3 py-2 font-medium">Brand</th>
            <th className="px-3 py-2 text-right font-medium">Units Moved</th>
            <th className="px-3 py-2 text-right font-medium">Total Cost</th>
            <th className="px-3 py-2 text-right font-medium">CPO</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const key = `${r.brand}__${r.monthKey}`;
            const isOpen = expanded.has(key);
            const sizes = sizeBand.filter((s) => s.brand === r.brand && s.monthKey === r.monthKey);
            return (
              <Fragment key={key}>
                <tr
                  onClick={() => toggle(key)}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`transition-transform ${isOpen ? "rotate-90" : ""} text-slate-400`}>›</span>
                      {r.brand}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatNumber(r.unitsSold)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatINR(r.cost.total)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatINR(r.cpo)}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800/60 dark:bg-slate-800/20">
                    <td colSpan={4} className="px-3 py-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="py-1 font-medium">Size</th>
                            <th className="py-1 text-right font-medium">Units</th>
                            <th className="py-1 text-right font-medium">Cost</th>
                            <th className="py-1 text-right font-medium">CPO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sizes.map((s) => (
                            <tr key={s.sizeBand} className="border-t border-slate-100 dark:border-slate-800/60">
                              <td className="py-1 text-slate-700 dark:text-slate-300">{s.sizeBand}</td>
                              <td className="py-1 text-right tabular-nums text-slate-700 dark:text-slate-300">
                                {formatNumber(s.unitsSold)}
                              </td>
                              <td className="py-1 text-right tabular-nums text-slate-700 dark:text-slate-300">
                                {formatINR(s.cost.total)}
                              </td>
                              <td className="py-1 text-right font-medium tabular-nums text-slate-900 dark:text-slate-100">
                                {formatINR(s.cpo)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
