import { getPriceTable, PRICE_VIEWS, type PriceView } from "@/lib/scraper/prices";
import { getIndustryTable } from "@/lib/scraper/industry";
import { getEnrichedRows } from "@/lib/scraper/enriched";
import { enrichedHeaders, enrichedCells } from "@/lib/export/detailed";
import type { Market } from "@/lib/markets";

/** A flat, header-driven table plus the trading code per row (for enrichment). */
export interface Dataset {
  title: string;
  filename: string;
  headers: string[];
  rows: string[][];
  codes: (string | null)[];
  scrapedAt: string;
}

/** Strip trailing footnote asterisks (LTP*, CLOSEP*, YCP*) for cleaner output. */
export function cleanHeader(h: string): string {
  return h.replace(/\s*\*+$/, "");
}

/** Resolve a price board (by view) into a flat table with codes. */
export async function resolvePriceDataset(view: PriceView): Promise<Dataset> {
  const t = await getPriceTable(view);
  return {
    title: `DSE Share Prices — ${PRICE_VIEWS[view].label}`,
    filename: `dse-prices-${view}`,
    headers: t.headers.map(cleanHeader),
    rows: t.rows,
    codes: t.codes,
    scrapedAt: t.scrapedAt,
  };
}

/** Resolve one sector board (by numeric area id) into a flat table with codes. */
export async function resolveIndustryDataset(area: string): Promise<Dataset> {
  const t = await getIndustryTable(area);
  return {
    title: `DSE Share Prices — ${t.sectorName}`,
    filename: `dse-industry-${area}`,
    headers: t.headers.map(cleanHeader),
    rows: t.rows,
    codes: t.codes,
    scrapedAt: t.scrapedAt,
  };
}

/**
 * Append the per-company enrichment columns (outstanding securities, 52-week
 * range, free-float cap, shareholding %) to each base row, matched by code.
 * This is the same merged column set the CSV/Excel/PDF exports use.
 */
export async function enrichDataset(
  data: Dataset,
  market: Market
): Promise<Dataset> {
  const codes = data.codes.filter((c): c is string => Boolean(c));
  const enriched = await getEnrichedRows(codes, market);
  const byCode = new Map(enriched.map((r) => [r.code, r]));

  return {
    ...data,
    headers: [...data.headers, ...enrichedHeaders()],
    rows: data.rows.map((row, i) => [
      ...row,
      ...enrichedCells(byCode.get(data.codes[i] ?? "")),
    ]),
  };
}
