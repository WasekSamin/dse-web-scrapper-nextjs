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

/**
 * Read the label/value pairs from one row of a company page's #company table.
 *
 * Labels are <th> cells and each value is the cell right after its label. SME
 * and ATB pages split some labels over two rows with rowspan, so a row can
 * start with a value that belongs to the label above, e.g. Change's percent:
 *   <tr><th rowspan="2">Change*</th><td>1.2</td><th>Day's Value</th><td>0.06</td></tr>
 *   <tr><td>4.40%</td><th>52 Weeks' Moving Range</th><td>27.20 - 54.00</td></tr>
 * Those leading cells are returned as `carry`, and a pair whose label spans
 * rows is flagged `spansRows` so the caller can join the carry onto it. Rows
 * with no <th> fall back to pairing cells two at a time.
 */
export function rowFields(
  $: cheerio.CheerioAPI,
  tr: Parameters<cheerio.CheerioAPI>[0]
): { carry: string; pairs: { label: string; value: string; spansRows?: boolean }[] } {
  const cells = $(tr)
    .children()
    .map((_, c) => ({
      isLabel: c.type === "tag" && c.name === "th",
      spansRows: Number($(c).attr("rowspan") ?? 1) > 1,
      text: cleanText($(c).text()),
    }))
    .get();
  const pairs: { label: string; value: string; spansRows?: boolean }[] = [];
  const add = (label: string, value: string, spansRows = false) => {
    if (label && value && /[a-zA-Z]/.test(label)) {
      pairs.push({
        label: label.replace(/[:*]+$/, "").trim(),
        value,
        ...(spansRows && { spansRows }),
      });
    }
  };

  const firstLabel = cells.findIndex((c) => c.isLabel);
  if (firstLabel === -1) {
    for (let k = 0; k + 1 < cells.length; k += 2) add(cells[k].text, cells[k + 1].text);
    return { carry: "", pairs };
  }

  const carry = cells
    .slice(0, firstLabel)
    .map((c) => c.text)
    .filter((t) => t && t !== "-") // "-" is DSE's "no value" placeholder
    .join(" ");
  for (let k = firstLabel; k < cells.length; k++) {
    if (cells[k].isLabel && k + 1 < cells.length && !cells[k + 1].isLabel) {
      add(cells[k].text, cells[k + 1].text, cells[k].spansRows);
      k++;
    }
  }
  return { carry, pairs };
}

/** Collapse whitespace/nbsp and trim. */
export function cleanText(s: string): string {
  return s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
}
