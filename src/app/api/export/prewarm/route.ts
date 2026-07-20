import { getPriceTable, PRICE_VIEWS } from "@/lib/scraper/prices";
import { getIndustryTable } from "@/lib/scraper/industry";
import { getEnrichedRows } from "@/lib/scraper/enriched";
import { prewarmQuerySchema } from "@/lib/schemas";
import type { Market } from "@/lib/markets";

export const dynamic = "force-dynamic";
// Prewarm scrapes every company's detail page (same work as an enriched export)
// to fill the cache ahead of time — allow the same generous budget.
export const maxDuration = 300;

/**
 * Warm the per-company enrichment cache for a prices/industry board so a later
 * export is a cache hit instead of ~N detail scrapes. Called fire-and-forget
 * from the client once the base table has loaded. The base table read reuses
 * the same short-lived cache the page already populated, so no double scrape.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const parsed = prewarmQuerySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid prewarm request" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const q = parsed.data;
  try {
    let codes: (string | null)[];
    let market: Market;
    if (q.source === "prices") {
      codes = (await getPriceTable(q.view)).codes;
      market = PRICE_VIEWS[q.view].market;
    } else {
      codes = (await getIndustryTable(q.area)).codes;
      market = "main";
    }

    const present = codes.filter((c): c is string => Boolean(c));
    await getEnrichedRows(present, market);
    return Response.json({ warmed: present.length });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Prewarm failed" }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }
}
