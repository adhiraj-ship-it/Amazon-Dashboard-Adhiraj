"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ALL_BRANDS } from "@/lib/cpo/aggregate";
import { CPO_ACCENT } from "@/lib/cpo/accent";
import { formatMonth } from "@/lib/cpo/format";
import type { BlockKey, CpoDashboardData } from "@/lib/cpo/types";
import { BrandByChannel } from "./BrandByChannel";
import { BreakdownGrid } from "./BreakdownGrid";
import { CpoRecap } from "./CpoRecap";
import { DataQualityPanel } from "./DataQualityPanel";
import { GlobalPoolPanel } from "./GlobalPoolPanel";
import { HeadlineStrip } from "./HeadlineStrip";
import { MovementBlocksTable } from "./MovementBlocksTable";
import { UtilisationGrid } from "./UtilisationGrid";
import { OverridePanel } from "./OverridePanel";
import { ThemeToggle } from "./ThemeToggle";

const AUTO_REFRESH_MS = 5 * 60 * 1000;
const ECOM_BLOCKS: BlockKey[] = ["Amazon", "Myntra"];
const GLOBAL_BLOCKS: BlockKey[] = ["Global"];

type Tab = "ecom" | "global";

function SectionHeading({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${CPO_ACCENT.heading}`}>
        <span className={`h-3 w-1 rounded-full ${CPO_ACCENT.bar}`} />
        {children}
      </h2>
      {hint && <p className="mt-1 pl-3 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function CpoDashboard() {
  const [data, setData] = useState<CpoDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("ecom");
  const [brand, setBrand] = useState<string>(ALL_BRANDS);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cpo", { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json()).error ?? `Request failed: ${res.status}`);
      const json: CpoDashboardData = await res.json();
      setData(json);
      setMonth((prev) => (prev && json.months.includes(prev) ? prev : (json.months.at(-1) ?? null)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load CPO data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load, not a derived-state sync
    load();
    const id = setInterval(load, AUTO_REFRESH_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const view = useMemo(() => {
    if (!data || !month) return null;
    return {
      headline: data.headline.find((h) => h.monthKey === month),
      blocks: data.movementBlocks.filter((b) => b.monthKey === month && b.brand === brand),
      globalBlocks: data.movementBlocks.filter((b) => b.monthKey === month && b.brand === ALL_BRANDS),
      brandChannel: data.brandChannel.filter((b) => b.monthKey === month),
      pool: data.globalPool.filter((p) => p.monthKey === month),
      brands: data.brandsByMonth[month] ?? [],
      ecom: {
        zone: data.ecom.zone.find((t) => t.monthKey === month),
        size: data.ecom.size.find((t) => t.monthKey === month),
        truck: data.ecom.truck.find((t) => t.monthKey === month),
        utilisation: data.ecom.utilisation.find((t) => t.monthKey === month),
      },
      global: {
        zone: data.global.zone.find((t) => t.monthKey === month),
        truck: data.global.truck.find((t) => t.monthKey === month),
        utilisation: data.global.utilisation.find((t) => t.monthKey === month),
      },
    };
  }, [data, month, brand]);

  const hasGlobalPoolRate = Boolean(data && data.globalPool.some((p) => p.rate > 0));

  const tabClass = (t: Tab) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      tab === t
        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
        : "text-slate-600 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-800"
    }`;

  return (
    <div className="mx-auto max-w-[110rem] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-5 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* The logo file has an opaque white background, so it sits on a
                white chip — that keeps the brand colours exact in dark mode
                instead of recolouring or inverting the mark. */}
            <span className="shrink-0 rounded-md bg-white px-2 py-1.5 ring-1 ring-slate-200 dark:ring-slate-700">
              <Image
                src="/esc-plan-logo.png"
                alt="ESC Plan"
                width={178}
                height={114}
                priority
                className="h-8 w-auto"
              />
            </span>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                <span aria-hidden="true">🚚</span>
                Logistics CPO Tracker - ECom
              </h1>
              {data && (
                <p className="mt-1 text-xs text-slate-500">
                  Invoice date {data.cutoverDate} onwards · Updated {new Date(data.fetchedAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          <button
            onClick={load}
            disabled={loading}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
            <button onClick={() => setTab("ecom")} className={tabClass("ecom")}>
              Ecom
            </button>
            <button onClick={() => setTab("global")} className={tabClass("global")}>
              Global
            </button>
          </div>

          {data && data.months.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="month-filter" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Month
              </label>
              <select
                id="month-filter"
                value={month ?? ""}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {data.months.map((m) => (
                  <option key={m} value={m}>
                    {formatMonth(m)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {!data && !error && <div className="py-24 text-center text-sm text-slate-500">Loading CPO data…</div>}

      {data && view && tab === "ecom" && (
        <div className="space-y-9">
          <section>
            <HeadlineStrip headline={view.headline} />
          </section>

          <section>
            <SectionHeading hint="Cost against the dispatches in each lane, the first-mile pool allocated onto warehouse-routed units, and the resulting CPO.">
              Movements
            </SectionHeading>
            <div className="mb-3 flex items-center gap-2">
              <label htmlFor="brand-filter" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Brand
              </label>
              <select
                id="brand-filter"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value={ALL_BRANDS}>{ALL_BRANDS}</option>
                {view.brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <MovementBlocksTable blocks={view.blocks} only={ECOM_BLOCKS} />
          </section>

          <section>
            <SectionHeading hint="Click a brand to see its CPO by size.">CPO by Brand</SectionHeading>
            <BrandByChannel rows={view.brandChannel} />
          </section>

          <section className="space-y-6">
            <SectionHeading hint="What's driving CPO up or down — where the units went, what sizes moved, and how well the trucks were filled.">
              Cost Drivers
            </SectionHeading>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Zone</h3>
              <BreakdownGrid
                table={view.ecom.zone}
                rowHeader="Zone"
                showCpo
                note="Intra rows never leave the premises, so they carry no freight."
              />
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Size Moved</h3>
              <BreakdownGrid table={view.ecom.size} rowHeader="Size" />
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Truck Size</h3>
              <BreakdownGrid
                table={view.ecom.truck}
                rowHeader="Truck"
                note="Percentages are of trucked units only — the Unspecified / intra row is counted in the totals but kept out of the ratio."
              />
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Truck Utilisation</h3>
              <UtilisationGrid table={view.ecom.utilisation} />
            </div>
          </section>

          <section>
            <SectionHeading>Overall CPO</SectionHeading>
            <CpoRecap blocks={view.blocks} only={ECOM_BLOCKS} />
          </section>

          <section>
            <DataQualityPanel dq={data.dataQuality} hasGlobalPoolRate={hasGlobalPoolRate} />
          </section>
        </div>
      )}

      {data && view && tab === "global" && (
        <div className="space-y-9">
          <section>
            <SectionHeading hint="Factory→Warehouse and Warehouse→Warehouse movement — the shared pool that gets allocated onto channel units.">
              Global Movements
            </SectionHeading>
            <MovementBlocksTable blocks={view.globalBlocks} only={GLOBAL_BLOCKS} />
          </section>

          <section>
            <SectionHeading>Pool CPO</SectionHeading>
            <CpoRecap blocks={view.globalBlocks} only={GLOBAL_BLOCKS} />
          </section>

          <section className="space-y-6">
            <SectionHeading hint="Where the pool moved and how full those trucks ran.">Global Cost Drivers</SectionHeading>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Zone</h3>
              <BreakdownGrid table={view.global.zone} rowHeader="Zone" showCpo />
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Truck Size</h3>
              <BreakdownGrid
                table={view.global.truck}
                rowHeader="Truck"
                note="Percentages are of trucked units only."
              />
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Truck Utilisation</h3>
              <UtilisationGrid table={view.global.utilisation} />
            </div>
          </section>

          <section>
            <SectionHeading hint="Every dispatch feeding the pool this month, with its cost and volume weight.">
              Pool Dispatches
            </SectionHeading>
            <GlobalPoolPanel pool={view.pool} />
          </section>

          <section>
            <SectionHeading hint="What actually gets allocated, and any manual nudge to a channel's CPO — both entered in the sheet.">
              Manual Inputs
            </SectionHeading>
            <OverridePanel
              overrides={data.overrides}
              months={data.months}
              firstMileRates={data.firstMileRates}
              tabFound={data.overridesTabFound}
              skippedRows={data.overridesSkippedRows}
              tabName={data.overridesTabName}
              sheetUrl={data.sheetUrl}
            />
          </section>
        </div>
      )}
    </div>
  );
}
