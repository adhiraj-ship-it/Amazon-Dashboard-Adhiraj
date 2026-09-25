export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function formatPercent1(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}
