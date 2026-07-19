import { fetchHtml } from "./client";
import { parseSharesTable } from "./parseTable";
import { cached } from "@/lib/cache";
import { PRICE_VIEWS, type PriceView } from "@/lib/views";
import type { ScrapedTable } from "@/lib/types";

// Re-export view metadata/helpers so existing server imports keep working.
export { PRICE_VIEWS, isPriceView, type PriceView } from "@/lib/views";

/** Scrape a Group-A share-price view into a header-driven table (cached ~30s). */
export function getPriceTable(view: PriceView): Promise<ScrapedTable> {
  const { path } = PRICE_VIEWS[view];
  return cached(`prices:${view}`, async () => {
    const html = await fetchHtml(path);
    return parseSharesTable(html);
  });
}
