import { formatINR, formatNumber } from "@/lib/cpo/format";
import type { BlockKey, MovementBlock, MovementLaneRow } from "@/lib/cpo/types";
import { ChannelLogo } from "./ChannelLogo";

const BLOCK_ORDER: BlockKey[] = ["Amazon", "Myntra", "Global"];

const BLOCK_TINT: Record<BlockKey, string> = {
  Amazon: "bg-amber-50/70 dark:bg-amber-950/20",
  Myntra: "bg-rose-50/70 dark:bg-rose-950/20",
  Global: "bg-teal-50/70 dark:bg-teal-950/20",
};

const ROWS: { key: keyof MovementLaneRow; label: string; money: boolean }[] = [
  { key: "dispatches", label: "Number of Dispatches", money: false },
  { key: "freightCost", label: "Cost", money: true },
  { key: "detentionHandlingCost", label: "Detention and Handling", money: true },
  { key: "firstMileAllocation", label: "First Mile Allocation", money: true },
  { key: "adjustment", label: "Adjustment", money: true },
  { key: "totalCost", label: "Total Cost", money: true },
  { key: "unitsMoved", label: "Units Moved", money: false },
];

export function MovementBlocksTable({ blocks, only }: { blocks: MovementBlock[]; only?: BlockKey[] }) {
  const wanted = only ?? BLOCK_ORDER;
  const ordered = BLOCK_ORDER.filter((key) => wanted.includes(key))
    .map((key) => blocks.find((b) => b.block === key))
    .filter(Boolean) as MovementBlock[];
  if (ordered.length === 0) return null;

  // Only show the Adjustment row when something is actually adjusted.
  const rows = ROWS.filter((r) => r.key !== "adjustment" || ordered.some((b) => b.adjustmentFactor !== 0));

  const columns = ordered.flatMap((b) => [...b.lanes.map((l) => ({ block: b, lane: l })), { block: b, lane: b.total }]);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900">
              Particulars
            </th>
            {ordered.map((b) => (
              <th
                key={b.block}
                colSpan={b.lanes.length + 1}
                title={b.adjustmentFactor ? `Includes a ${(b.adjustmentFactor * 100).toFixed(1)}% manual adjustment` : undefined}
                className={`border-l border-slate-200 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:text-slate-200 ${BLOCK_TINT[b.block]}`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ChannelLogo channel={b.block} size={14} />
                  {b.block}
                  {b.adjustmentFactor !== 0 && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium normal-case text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      {b.adjustmentFactor > 0 ? "+" : ""}
                      {(b.adjustmentFactor * 100).toFixed(1)}% adj
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="sticky left-0 z-10 bg-white px-3 py-1.5 dark:bg-slate-900" />
            {columns.map(({ block, lane }, i) => (
              <th
                key={`${block.block}-${lane.label}-${i}`}
                className={`whitespace-nowrap px-3 py-1.5 text-right text-[11px] font-medium uppercase tracking-wide ${
                  lane.label === "Total"
                    ? "border-r border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                    : "text-slate-500"
                } ${BLOCK_TINT[block.block]}`}
              >
                {lane.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className={`border-b border-slate-100 dark:border-slate-800/60 ${
                row.key === "totalCost" ? "border-t-2 border-t-slate-300 font-semibold dark:border-t-slate-600" : ""
              }`}
            >
              <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {row.label}
              </td>
              {columns.map(({ block, lane }, i) => {
                const value = lane[row.key] as number;
                const isTotalCol = lane.label === "Total";
                return (
                  <td
                    key={`${block.block}-${lane.label}-${i}`}
                    className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${
                      isTotalCol ? "border-r border-slate-200 font-medium dark:border-slate-700" : ""
                    } ${value === 0 ? "text-slate-400" : "text-slate-800 dark:text-slate-200"}`}
                  >
                    {value === 0 ? "–" : row.money ? formatINR(value) : formatNumber(value)}
                  </td>
                );
              })}
            </tr>
          ))}

          <tr>
            <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2 font-semibold text-slate-900 dark:bg-slate-900 dark:text-slate-100">
              CPO
            </td>
            {columns.map(({ block, lane }, i) => (
              <td
                key={`${block.block}-cpo-${i}`}
                className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${
                  lane.label === "Total"
                    ? "border-r border-slate-200 bg-amber-100 font-bold text-slate-900 dark:border-slate-700 dark:bg-amber-900/40 dark:text-slate-100"
                    : "text-slate-400"
                }`}
              >
                {lane.label === "Total" ? formatINR(block.cpo) : "–"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
