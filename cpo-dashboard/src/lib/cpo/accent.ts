// Self-contained accent system for the CPO tracker, deliberately not shared
// with ../accent.ts (the Amazon ads dashboard's) so the two features stay
// fully decoupled.
export const CPO_ACCENT = {
  heading: "text-emerald-700 dark:text-emerald-300",
  bar: "bg-emerald-500",
  headerRow: "bg-emerald-50/70 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/60",
  headerText: "text-emerald-700 dark:text-emerald-300",
};

export function coverageTone(pct: number): { text: string; bg: string; dot: string } {
  if (pct >= 0.9) {
    return {
      text: "text-emerald-700 dark:text-emerald-300",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      dot: "bg-emerald-500",
    };
  }
  if (pct >= 0.6) {
    return {
      text: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      dot: "bg-amber-500",
    };
  }
  return {
    text: "text-rose-700 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    dot: "bg-rose-500",
  };
}
