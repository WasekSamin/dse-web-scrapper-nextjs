import * as cheerio from "cheerio";
import { fetchHtml } from "./client";
import { parseSharesTable, cleanText } from "./parseTable";
import { cached } from "@/lib/cache";
import type { Industry, ScrapedTable } from "@/lib/types";

/**
 * Scrape the list of DSE business areas / sectors from by_industrylisting.php.
 * Each row links to companylistbyindustry.php?industryno=<id> (the sector name)
 * and ltp_industry.php?area=<id> (the same id). Cached for an hour — this list
 * changes very rarely.
 */
export function getIndustries(): Promise<Industry[]> {
  return cached(
    "industries",
    async () => {
      const html = await fetchHtml("/by_industrylisting.php");
      const $ = cheerio.load(html);
      const map = new Map<string, string>();

      $("tr").each((_, tr) => {
        const $tr = $(tr);
        const areaLink = $tr.find('a[href*="ltp_industry.php?area="]');
        if (areaLink.length === 0) return;
        const area = areaLink
          .attr("href")!
          .match(/area=(\d+)/)?.[1];
        const name = cleanText(
          $tr.find('a[href*="companylistbyindustry.php?industryno="]').text()
        );
        if (area && name) map.set(area, name);
      });

      return [...map.entries()]
        .map(([area, name]) => ({ area, name }))
        .sort((a, b) => Number(a.area) - Number(b.area));
    },
    60 * 60 * 1000
  );
}

/** Scrape the share-price table for one sector (by `area` id). */
export function getIndustryTable(
  area: string
): Promise<ScrapedTable & { sectorName: string }> {
  return cached(`industry:${area}`, async () => {
    const html = await fetchHtml(`/ltp_industry.php?area=${encodeURIComponent(area)}`);
    const table = parseSharesTable(html);

    // The page title reads: "... for Business Area: <NAME> on <date> ...".
    const $ = cheerio.load(html);
    const bodyText = $("body").text();
    const m = bodyText.match(/Business Area:\s*(.+?)\s+on\s/i);
    const sectorName = m ? cleanText(m[1]) : `Area ${area}`;

    return { ...table, sectorName };
  });
}
