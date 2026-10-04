import * as cheerio from "cheerio";
import { fetchHtml } from "./client";
import { cleanText, rowFields } from "./parseTable";
import { cached } from "@/lib/cache";
import { MARKETS, type Market } from "@/lib/markets";

/** One shareholding-percentage snapshot for a company. */
export interface ShareholdingPeriod {
  asOn: string;
  sponsorDirector: string;
  govt: string;
  institute: string;
  foreign: string;
  public: string;
}

/** Per-company detail data used to enrich a share-price export. */
export interface EnrichedRow {
  code: string;
  outstandingSecurities: string;
  movingRange52w: string;
  volume: string;
  freeFloatCap: string;
  shareholding: ShareholdingPeriod[];
}

/** Build a label→value map from the #company overview rows. */
function fieldMap($: cheerio.CheerioAPI): Record<string, string> {
  const map: Record<string, string> = {};
  $("#company tr").each((_, tr) => {
    for (const { label, value } of rowFields($, tr).pairs) map[label] = value;
  });
  return map;
}

function lookup(map: Record<string, string>, re: RegExp): string {
  const key = Object.keys(map).find((k) => re.test(k));
  return key ? map[key] : "";
}

/** Extract up to three shareholding-percentage snapshots from the page text. */
function parseShareholding(bodyText: string): ShareholdingPeriod[] {
  const text = bodyText.replace(/ /g, " ");
  const re =
    /Share Holding Percentage\s*\[as on ([^\]]+)\][\s\S]{0,400}?Sponsor\/Director:\s*([\d.]+)[\s\S]{0,60}?Govt:\s*([\d.]+)[\s\S]{0,60}?Institute:\s*([\d.]+)[\s\S]{0,60}?Foreign:\s*([\d.]+)[\s\S]{0,60}?Public:\s*([\d.]+)/g;
  const out: ShareholdingPeriod[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({
      asOn: cleanText(m[1]),
      sponsorDirector: m[2],
      govt: m[3],
      institute: m[4],
      foreign: m[5],
      public: m[6],
    });
  }
  return out;
}

// The exported enrichment columns (outstanding securities, 52-week range,
// free-float cap, shareholding %) are near-static, so cache them long enough to
// survive a browsing session. This lets a background prewarm on page load stay
// warm until the user clicks Export, turning the export into a cache hit.
const ENRICHED_TTL_MS = 30 * 60 * 1000;

/**
 * Scrape one company's detail page into an enriched row. Cached ~30 min. Never
 * throws — a page that fails (e.g. some bonds) yields a row with just the code.
 */
export function getCompanyRow(
  code: string,
  market: Market = "main"
): Promise<EnrichedRow> {
  return cached(
    `enriched:${market}:${code}`,
    async () => {
      try {
        const html = await fetchHtml(MARKETS[market].companyUrl(code));
        // Parse the HTML once and reuse it for both the field map and the
        // shareholding block (previously parsed twice per company).
        const $ = cheerio.load(html);
        const map = fieldMap($);
        return {
          code,
          outstandingSecurities: lookup(map, /Outstanding Securities/i),
          movingRange52w: lookup(map, /Moving Range/i),
          volume: lookup(map, /Day'?s Volume/i),
          freeFloatCap: lookup(map, /Free Float/i),
          shareholding: parseShareholding($("body").text()),
        };
      } catch {
        return {
          code,
          outstandingSecurities: "",
          movingRange52w: "",
          volume: "",
          freeFloatCap: "",
          shareholding: [],
        };
      }
    },
    ENRICHED_TTL_MS
  );
}

/** Map over items with a bounded concurrency pool. */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

/** Enrich a list of trading codes (bounded concurrency, per-company cache). */
export function getEnrichedRows(
  codes: string[],
  market: Market = "main",
  concurrency = 20
): Promise<EnrichedRow[]> {
  return mapPool(codes, concurrency, (code) => getCompanyRow(code, market));
}
