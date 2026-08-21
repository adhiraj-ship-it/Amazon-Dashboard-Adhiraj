"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { BRANDS, BRAND_LABELS, type Brand } from "@/lib/config";
import type { DashboardData } from "@/lib/types";
import { SummaryCards } from "./SummaryCards";
import { TrendChart } from "./TrendChart";
import { StyleTable } from "./StyleTable";

const RANGE_PRESETS = [7, 14, 30, 90] as const;
const AUTO_REFRESH_MS = 5 * 60 * 1000;

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function Dashboard() {
  const [brand, setBrand] = useState<Brand>("snitch");
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (b: Brand, days: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ brand: b });
      // Anchor the range to the latest known data date on first load; once we
      // have a maxDate we pass explicit start/end so refreshes keep the range stable.
      const res = await fetch(`/api/dashboard?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json()).error ?? `Request failed: ${res.status}`);
      const initial: DashboardData = await res.json();

      const end = initial.dataMaxDate;
      const start = addDays(end, -(days - 1));
      if (start === initial.rangeStart && end === initial.rangeEnd) {
        setData(initial);
        return;
      }

      const params2 = new URLSearchParams({ brand: b, start, end });
      const res2 = await fetch(`/api/dashboard?${params2.toString()}`, { cache: "no-store" });
      if (!res2.ok) throw new Error((await res2.json()).error ?? `Request failed: ${res2.status}`);
      setData(await res2.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(brand, rangeDays);
    const id = setInterval(() => load(brand, rangeDays), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [brand, rangeDays, load]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            Amazon Performance Dashboard
          </h1>
          {data && (
            <p className="mt-0.5 text-xs text-neutral-500">
              {data.rangeStart} → {data.rangeEnd}
              {data.asOf && ` · Inventory as of ${data.asOf}`}
              {" · Updated "}
              {new Date(data.fetchedAt).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-neutral-300 p-0.5 dark:border-neutral-700">
            {BRANDS.map((b) => (
              <button
                key={b}
                onClick={() => setBrand(b)}
                className={clsx(
                  "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  brand === b
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                )}
              >
                {BRAND_LABELS[b]}
              </button>
            ))}
          </div>

          <div className="flex rounded-md border border-neutral-300 p-0.5 dark:border-neutral-700">
            {RANGE_PRESETS.map((d) => (
              <button
                key={d}
                onClick={() => setRangeDays(d)}
                className={clsx(
                  "rounded px-2.5 py-1.5 text-sm font-medium transition-colors",
                  rangeDays === d
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                )}
              >
                {d}d
              </button>
            ))}
          </div>

          <button
            onClick={() => load(brand, rangeDays)}
            disabled={loading}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {!data && !error && (
        <div className="py-24 text-center text-sm text-neutral-500">Loading dashboard…</div>
      )}

      {data && (
        <div className="space-y-6">
          <SummaryCards totals={data.totals} />
          <TrendChart trend={data.trend} />
          <StyleTable styles={data.styles} />
        </div>
      )}
    </div>
  );
}
