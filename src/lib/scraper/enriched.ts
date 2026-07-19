import * as cheerio from "cheerio";
import { fetchHtml } from "./client";
import { cleanText } from "./parseTable";
import { cached } from "@/lib/cache";

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
function fieldMap(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const map: Record<string, string> = {};
  $("#company tr").each((_, tr) => {
    const cells = $(tr)
      .children()
      .map((__, c) => cleanText($(c).text()))
      .get();
    for (let k = 0; k + 1 < cells.length; k += 2) {
      const label = cells[k];
      const value = cells[k + 1];
      if (label && value && /[a-zA-Z]/.test(label)) {
        map[label.replace(/[:*]+$/, "")] = value;
      }
    }
  });
  return map;
}

function lookup(map: Record<string, string>, re: RegExp): string {
  const key = Object.keys(map).find((k) => re.test(k));
  return key ? map[key] : "";
}

/** Extract up to three shareholding-percentage snapshots from the page text. */
function parseShareholding(html: string): ShareholdingPeriod[] {
  const text = cheerio.load(html)("body").text().replace(/ /g, " ");
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

/**
 * Scrape one company's detail page into an enriched row. Cached ~5 min. Never
 * throws — a page that fails (e.g. some bonds) yields a row with just the code.
 */
export function getCompanyRow(code: string): Promise<EnrichedRow> {
  return cached(
    `enriched:${code}`,
    async () => {
      try {
        const html = await fetchHtml(
          `/displayCompany.php?name=${encodeURIComponent(code)}`
        );
        const map = fieldMap(html);
        return {
          code,
          outstandingSecurities: lookup(map, /Outstanding Securities/i),
          movingRange52w: lookup(map, /Moving Range/i),
          volume: lookup(map, /Day'?s Volume/i),
          freeFloatCap: lookup(map, /Free Float/i),
          shareholding: parseShareholding(html),
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
    5 * 60 * 1000
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
  concurrency = 10
): Promise<EnrichedRow[]> {
  return mapPool(codes, concurrency, (code) => getCompanyRow(code));
}
