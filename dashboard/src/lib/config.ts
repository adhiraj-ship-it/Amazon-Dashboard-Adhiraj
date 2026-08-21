export const SHEET_ID =
  process.env.GOOGLE_SHEET_ID ?? "1cqcpJmaeUESpTv1VDcyToC8JVLUnxcIdsXbXK3T_B14";

export const BRANDS = ["snitch", "rare"] as const;
export type Brand = (typeof BRANDS)[number];

export const BRAND_LABELS: Record<Brand, string> = {
  snitch: "Snitch",
  rare: "Rare",
};

// Sheet tab gids (used for public CSV export) and titles (used by the
// authenticated Sheets API, which addresses tabs by name, not gid).
export const TABS = {
  adsData: {
    snitch: { gid: "432493878", title: "Snitch Data" },
    rare: { gid: "190461206", title: "Rare Data" },
  },
  inventory: {
    snitch: { gid: "505565926", title: "Inventory_Aug_Snitch" },
    rare: { gid: "268030796", title: "Inventory_Aug_Rare" },
  },
  primaryData: { gid: "1696658210", title: "Primary Data" },
} as const;
