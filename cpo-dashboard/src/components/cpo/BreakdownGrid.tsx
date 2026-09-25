import { Fragment } from "react";
import { formatNumber, formatPercent1 } from "@/lib/cpo/format";
import type { BlockKey, BreakdownTable } from "@/lib/cpo/types";
import { ChannelLogo } from "./ChannelLogo";

const BLOCK_ORDER: BlockKey[] = ["Amazon", "Myntra", "Global"];

const BLOCK_TINT: Record<BlockKey, string> = {
  Amazon: "bg-amber-50/70 dark:bg-amber-950/20",
  Myntra: "bg-rose-50/70 dark:bg-rose-950/20",
  Global: "bg-teal-50/70 dark:bg-teal-950/20",
};

export function BreakdownGrid({
  table,
  rowHeader,
  note,
}: {
  table: BreakdownTable | undefined;
  rowHeader: string;
  note?: string;
}) {
  if (!table || table.rows.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        No data for this month.
      </div>
    );
  }

  /** Brand sub-columns only where brand is knowable; everything gets Total + Share. */
  const brandsFor = (block: BlockKey) => (table.brandUnavailableBlocks.includes(block) ? [] : table.brands);
  const spanFor = (block: BlockKey) => brandsFor(block).length + 2;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900">
              {rowHeader}
            </th>
            {BLOCK_ORDER.map((b) => (
              <th
                key={b}
                colSpan={spanFor(b)}
                className={`border-l border-slate-200 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:text-slate-200 ${BLOCK_TINT[b]}`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ChannelLogo channel={b} size={14} />
                  {b}
                </span>
              </th>
            ))}
          </tr>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="sticky left-0 z-10 bg-white dark:bg-slate-900" />
            {BLOCK_ORDER.map((b) => (
              <Fragment key={b}>
                {brandsFor(b).map((brand, i) => (
                  <th
                    key={brand}
                    className={`whitespace-nowrap px-3 py-1 text-right text-[11px] font-medium uppercase tracking-wide text-slate-500 ${
                      i === 0 ? "border-l border-slate-200 dark:border-slate-700" : ""
                    } ${BLOCK_TINT[b]}`}
                  >
                    {brand}
                  </th>
                ))}
                <th
                  className={`whitespace-nowrap px-3 py-1 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200 ${
                    brandsFor(b).length === 0 ? "border-l border-slate-200 dark:border-slate-700" : ""
                  } ${BLOCK_TINT[b]}`}
                >
                  Total
                </th>
                <th className={`whitespace-nowrap px-3 py-1 text-right text-[11px] font-medium uppercase tracking-wide text-slate-500 ${BLOCK_TINT[b]}`}>
                  Share
                </th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.label} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
              <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {row.label}
              </td>
              {BLOCK_ORDER.map((b) => {
                const unavailable = table.unavailableBlocks.includes(b);
                const cell = row.cells[b];
                return (
                  <Fragment key={b}>
                    {brandsFor(b).map((brand, i) => {
                      const units = cell.byBrand[brand] ?? 0;
                      return (
                        <td
                          key={brand}
                          className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${
                            i === 0 ? "border-l border-slate-100 dark:border-slate-800/60" : ""
                          } ${unavailable || units === 0 ? "text-slate-400" : "text-slate-700 dark:text-slate-300"}`}
                        >
                          {unavailable ? "n/a" : units === 0 ? "–" : formatNumber(units)}
                        </td>
                      );
                    })}
                    <td
                      className={`whitespace-nowrap px-3 py-1.5 text-right font-medium tabular-nums ${
                        brandsFor(b).length === 0 ? "border-l border-slate-100 dark:border-slate-800/60" : ""
                      } ${unavailable || cell.units === 0 ? "text-slate-400" : "text-slate-800 dark:text-slate-200"}`}
                    >
                      {unavailable ? "n/a" : cell.units === 0 ? "–" : formatNumber(cell.units)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${
                        unavailable || cell.units === 0 ? "text-slate-400" : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {unavailable || cell.units === 0 ? "–" : formatPercent1(cell.pct)}
                    </td>
                  </Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {(note || table.unavailableBlocks.length > 0 || table.brandUnavailableBlocks.length > 0) && (
        <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500 dark:border-slate-800/60">
          {note}
          {table.unavailableBlocks.length > 0 &&
            ` ${table.unavailableBlocks.join(", ")} shows "n/a" — Working RCA records only Style for those dispatches, never Size.`}
          {table.brandUnavailableBlocks.length > 0 &&
            ` ${table.brandUnavailableBlocks.join(", ")} has no brand split — pool dispatches carry Style but never a brand.`}
        </p>
      )}
    </div>
  );
}
