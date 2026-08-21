"use client";

import { Fragment, useState } from "react";
import type { Metrics, StyleRow } from "@/lib/types";
import { formatCurrency, formatDays, formatNumber, formatPercent, formatRatio } from "@/lib/format";

const columns: { key: keyof Metrics; label: string; render: (v: number) => string }[] = [
  { key: "units", label: "Units", render: (v) => formatNumber(v) },
  { key: "revenue", label: "Secondary Sales", render: formatCurrency },
  { key: "drr", label: "DRR", render: (v) => formatNumber(v, 1) },
  { key: "spend", label: "Ad Spend", render: formatCurrency },
  { key: "roas", label: "ROAS", render: (v) => formatRatio(v) },
  { key: "cac", label: "CAC", render: formatCurrency },
  { key: "impressions", label: "Impressions", render: (v) => formatNumber(v) },
  { key: "ctr", label: "CTR", render: (v) => formatPercent(v) },
  { key: "inventory", label: "Inventory", render: (v) => formatNumber(v) },
  { key: "doh", label: "DOH", render: formatDays },
];

function MetricCells({ metrics }: { metrics: Metrics }) {
  return (
    <>
      {columns.map((c) => (
        <td key={c.key} className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
          {c.render(metrics[c.key])}
        </td>
      ))}
    </>
  );
}

export function StyleTable({ styles }: { styles: StyleRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(style: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(style)) next.delete(style);
      else next.add(style);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
            <th className="px-3 py-2 font-medium">Style</th>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 text-right font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {styles.map((s) => {
            const isOpen = expanded.has(s.style);
            return (
              <Fragment key={s.style}>
                <tr
                  onClick={() => toggle(s.style)}
                  className="cursor-pointer border-b border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-neutral-900 dark:text-neutral-100">
                    <span className="mr-1.5 inline-block w-3 text-neutral-400">{isOpen ? "▾" : "▸"}</span>
                    {s.style}
                  </td>
                  <MetricCells metrics={s} />
                </tr>
                {isOpen &&
                  s.sizes.map((size) => (
                    <tr key={`${s.style}-${size.size}`} className="border-b border-neutral-50 bg-neutral-50/60 dark:border-neutral-800/40 dark:bg-neutral-800/20">
                      <td className="whitespace-nowrap px-3 py-2 pl-8 text-neutral-600 dark:text-neutral-400">
                        {size.size}
                      </td>
                      <MetricCells metrics={size} />
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
