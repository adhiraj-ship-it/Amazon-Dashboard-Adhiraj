import { formatINR, formatNumber } from "@/lib/cpo/format";
import type { BlockKey, MovementBlock } from "@/lib/cpo/types";
import { ChannelLogo } from "./ChannelLogo";

const BLOCK_ORDER: BlockKey[] = ["Amazon", "Myntra", "Global"];

const BLOCK_ACCENT: Record<BlockKey, string> = {
  Amazon: "border-amber-200 dark:border-amber-900/60",
  Myntra: "border-rose-200 dark:border-rose-900/60",
  Global: "border-teal-200 dark:border-teal-900/60",
};

export function CpoRecap({ blocks, only }: { blocks: MovementBlock[]; only?: BlockKey[] }) {
  const wanted = only ?? BLOCK_ORDER;
  const shown = BLOCK_ORDER.filter((key) => wanted.includes(key));
  return (
    <div className={`grid grid-cols-1 gap-4 ${shown.length > 1 ? "sm:grid-cols-3" : "sm:max-w-sm"}`}>
      {shown.map((key) => {
        const b = blocks.find((x) => x.block === key);
        return (
          <div
            key={key}
            className={`rounded-lg border-t-4 bg-white p-4 shadow-sm dark:bg-slate-900 ${BLOCK_ACCENT[key]} border border-slate-200 dark:border-slate-800`}
          >
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              <ChannelLogo channel={key} size={14} />
              {key}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
              {b ? formatINR(b.cpo) : "–"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {b ? `${formatINR(b.total.totalCost)} over ${formatNumber(b.unitsMoved)} units` : "No data"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
