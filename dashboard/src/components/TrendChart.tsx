"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardData } from "@/lib/types";

export function TrendChart({ trend }: { trend: DashboardData["trend"] }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Units & Spend over time
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
            <YAxis yAxisId="units" tick={{ fontSize: 11 }} width={40} />
            <YAxis yAxisId="spend" orientation="right" tick={{ fontSize: 11 }} width={40} />
            <Tooltip />
            <Line yAxisId="units" type="monotone" dataKey="units" stroke="#2563eb" strokeWidth={2} dot={false} name="Units" />
            <Line yAxisId="spend" type="monotone" dataKey="spend" stroke="#f97316" strokeWidth={2} dot={false} name="Spend" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
