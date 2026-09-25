"use client";

import { Fragment, useState } from "react";
import { formatINR, formatNumber } from "@/lib/cpo/format";
import type { BrandChannelSummary } from "@/lib/cpo/types";
import { ChannelLogo } from "./ChannelLogo";

const CHANNELS = ["Amazon", "Myntra"];

const HEADER_TINT: Record<string, string> = {
  Amazon: "bg-amber-50/70 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50",
  Myntra: "bg-rose-50/70 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/50",
};

export function BrandByChannel({ rows }: { rows: BrandChannelSummary[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {CHANNELS.map((channel) => {
        const brands = rows.filter((r) => r.channel === channel);
        return (
          <div
            key={channel}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div
              className={`flex items-center gap-1.5 border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200 ${HEADER_TINT[channel]}`}
            >
              <ChannelLogo channel={channel} size={14} />
              {channel}
            </div>

            {brands.length === 0 ? (
              <p className="px-3 py-6 text-sm text-slate-500">No data for this month.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800/60">
                    <th className="px-3 py-1.5 font-medium">Brand</th>
                    <th className="px-3 py-1.5 text-right font-medium">Units</th>
                    <th className="px-3 py-1.5 text-right font-medium">Total Cost</th>
                    <th className="px-3 py-1.5 text-right font-medium">CPO</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((r) => {
                    const key = `${r.channel}__${r.brand}`;
                    const isOpen = expanded.has(key);
                    return (
                      <Fragment key={key}>
                        <tr
                          onClick={() => toggle(key)}
                          className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                        >
                          <td className="whitespace-nowrap px-3 py-1.5 font-medium text-slate-900 dark:text-slate-100">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`transition-transform ${isOpen ? "rotate-90" : ""} text-slate-400`}>›</span>
                              {r.brand}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{formatNumber(r.unitsSold)}</td>
                          <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{formatINR(r.cost.total)}</td>
                          <td className="whitespace-nowrap px-3 py-1.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
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
                                  {r.sizes.map((s) => (
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
            )}
          </div>
        );
      })}
    </div>
  );
}
