import * as cheerio from "cheerio";
import type { ScrapedTable } from "@/lib/types";

/**
 * Parse the main DSE price/industry data table out of a page's HTML.
 *
 * All the share-price pages and the industry page render the same widget:
 *   <table class="... shares-table ...">
 *     <thead><tr><th>#</th><th>TRADING CODE</th>...</tr></thead>
 *     <tr><td>1</td><td><a href="displayCompany.php?name=CODE">CODE</a></td>...</tr>
 *   </table>
 *
 * The parser is header-driven: it reads whatever columns exist (the industry
 * page adds extra LTY and OAP columns), so downstream display/export adapt.
 */
export function parseSharesTable(html: string): ScrapedTable {
  const $ = cheerio.load(html);

  const table = $("table.shares-table").first();
  if (table.length === 0) {
    throw new Error("Could not find shares data table (table.shares-table)");
  }

  // Price pages wrap headers in <thead>; the industry page puts the <th> row
  // directly in the table with no <thead>. Support both.
  let headerCells = table.find("thead th");
  if (headerCells.length === 0) {
    headerCells = table.find("tr").first().find("th");
  }
  const headers: string[] = [];
  headerCells.each((_, th) => {
    headers.push(cleanText($(th).text()));
  });

  const rows: string[][] = [];
  const codes: (string | null)[] = [];

  // Data rows: every <tr> that has <td> cells (skips the thead header row).
  table.find("tr").each((_, tr) => {
    const $tr = $(tr);
    const tds = $tr.find("> td");
    if (tds.length === 0) return;

    const cells: string[] = [];
    tds.each((__, td) => {
      cells.push(cleanText($(td).text()));
    });
    rows.push(cells);

    const link = $tr.find('a[href*="displayCompany.php?name="]').attr("href");
    codes.push(link ? extractCode(link) : null);
  });

  return {
    headers,
    rows,
    codes,
    scrapedAt: new Date().toISOString(),
  };
}

/** Pull the trading code out of a displayCompany.php?name=CODE href. */
export function extractCode(href: string): string | null {
  const m = href.match(/name=([^&]+)/);
  return m ? decodeURIComponent(m[1]).trim() : null;
}

/** Collapse whitespace/nbsp and trim. */
export function cleanText(s: string): string {
  return s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
}
