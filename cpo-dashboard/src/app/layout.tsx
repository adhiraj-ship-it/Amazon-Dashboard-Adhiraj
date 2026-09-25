import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Logistics CPO Tracker - ECom",
  description: "Cost-per-unit tracking by channel, movement lane, zone, size, and brand",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950">{children}</body>
    </html>
  );
}
