// Client-safe metadata for the 8 Group-A share-price views. Kept free of any
// Node-only imports (axios/cheerio) so it can be used in client components and
// Zod schemas without pulling the scraper into the browser bundle.

export const PRICE_VIEWS = {
  latest: { label: "By Trade Code", path: "/latest_share_price_scroll_l.php" },
  change: { label: "By Change", path: "/latest_share_price_scroll_by_change.php" },
  value: { label: "By Value", path: "/latest_share_price_scroll_by_value.php" },
  volume: { label: "By Volume", path: "/latest_share_price_scroll_by_volume.php" },
  ltp: { label: "By LTP", path: "/latest_share_price_scroll_by_ltp.php" },
  group: { label: "By Group", path: "/latest_share_price_scroll_group.php" },
  alpha: { label: "Alphabetical", path: "/latest_share_price_alpha.php" },
  treasury: {
    label: "Treasury Bond",
    path: "/latest_share_price_scroll_treasury_bond.php",
  },
} as const;

export type PriceView = keyof typeof PRICE_VIEWS;

export function isPriceView(v: string): v is PriceView {
  return Object.prototype.hasOwnProperty.call(PRICE_VIEWS, v);
}

export const PRICE_VIEW_KEYS = Object.keys(PRICE_VIEWS) as PriceView[];
