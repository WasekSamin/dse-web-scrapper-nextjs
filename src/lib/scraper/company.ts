import * as cheerio from "cheerio";
import { fetchHtml } from "./client";
import { cleanText } from "./parseTable";
import { cached } from "@/lib/cache";
import { MARKETS, type Market } from "@/lib/markets";
import type {
  CompanyDetail,
  CompanyField,
  CompanyHeadline,
  CompanySection,
} from "@/lib/types";

// Ordered sections + the label patterns that belong to each. First match wins,
// so more specific sections (Market Cap) are listed before looser ones.
const SECTION_RULES: { title: string; match: RegExp[] }[] = [
  {
    title: "Price",
    match: [
      /last trading price/i,
      /closing price/i,
      /opening price/i,
      /adjusted opening/i,
      /yesterday'?s closing/i,
      /day'?s range/i,
      /moving range/i,
      /last update/i,
      /change/i,
    ],
  },
  {
    title: "Trading Activity",
    match: [/day'?s trade/i, /day'?s volume/i, /day'?s value/i],
  },
  {
    title: "Market Cap & Capital",
    match: [
      /market cap/i,
      /free float/i,
      /authorized capital/i,
      /paid-?up capital/i,
      /outstanding securities/i,
      /face.?\/?par value/i,
      /market lot/i,
    ],
  },
  {
    title: "Dividend & Reserves",
    match: [/dividend/i, /bonus/i, /right issue/i, /reserve/i, /comprehensive income|oci/i],
  },
  {
    title: "Company Profile",
    match: [
      /trading code/i,
      /scrip code/i,
      /sector/i,
      /type of instrument/i,
      /year end/i,
      /listing year/i,
      /debut trading/i,
    ],
  },
  { title: "Filings & Links", match: [/financial statement/i, /price sensitive/i] },
];

function sectionFor(label: string): string {
  for (const s of SECTION_RULES) {
    if (s.match.some((re) => re.test(label))) return s.title;
  }
  return "Other";
}

export function getCompany(
  code: string,
  market: Market = "main"
): Promise<CompanyDetail> {
  return cached(`company:${market}:${code}`, async () => {
    const html = await fetchHtml(MARKETS[market].companyUrl(code));
    const $ = cheerio.load(html);

    const table = $("#company");
    if (table.length === 0) {
      throw new Error(`Company "${code}" not found (no #company table)`);
    }

    const nameMatch = $("body").text().match(/Company Name:\s*([^\n<]+?)\s{2,}/);
    const name = nameMatch ? cleanText(nameMatch[1]) : code;

    // 1) Pull a flat, ordered list of label/value pairs from the overview rows.
    const flat: CompanyField[] = [];
    let financialsStarted = false;

    table.find("tr").each((_, tr) => {
      const $tr = $(tr);
      const rowText = cleanText($tr.text());
      if (/Graph:|Select Option/.test(rowText)) return;

      const cells = $tr.children().map((__, c) => cleanText($(c).text())).get();
      const first = cells[0] ?? "";

      if (/^Particulars\b/i.test(first)) {
        financialsStarted = true;
        return;
      }

      if (!financialsStarted) {
        // Identity row: "Trading Code: GP | Scrip Code: 27001".
        if (/Trading Code\s*:/i.test(rowText)) {
          for (const cell of cells) {
            const m = cell.match(/^(.+?):\s*(.+)$/);
            if (m) flat.push({ label: cleanText(m[1]), value: cleanText(m[2]) });
          }
          return;
        }
        for (let k = 0; k + 1 < cells.length; k += 2) {
          const label = cells[k];
          const value = cells[k + 1];
          if (label && value && /[a-zA-Z]/.test(label)) {
            flat.push({ label: label.replace(/[:*]+$/, ""), value });
          }
        }
      } else if (/Details of Financial|Price Sensitive|Listing Year/i.test(first)) {
        if (cells[1]) flat.push({ label: first.replace(/[:*]+$/, ""), value: cells[1] });
      }
    });

    // 2) Split the combined "Change" cell ("0.2 0.08%") into two fields.
    const splitFlat: CompanyField[] = [];
    for (const f of flat) {
      if (/^change$/i.test(f.label)) {
        const m = f.value.match(/^(-?[\d,.]+)\s+(-?[\d,.]+%?)/);
        if (m) {
          splitFlat.push({ label: "Change", value: signed(m[1]) });
          splitFlat.push({ label: "% Change", value: signedPct(m[2]) });
          continue;
        }
      }
      splitFlat.push(f);
    }

    // 3) Distribute into ordered sections.
    const byTitle = new Map<string, CompanyField[]>();
    for (const f of splitFlat) {
      const title = sectionFor(f.label);
      if (!byTitle.has(title)) byTitle.set(title, []);
      byTitle.get(title)!.push(f);
    }
    const order = [...SECTION_RULES.map((s) => s.title), "Other"];
    const sections: CompanySection[] = order
      .filter((t) => byTitle.has(t))
      .map((title) => ({ title, fields: byTitle.get(title)! }));

    // 4) Build the headline from known price fields.
    const find = (re: RegExp) =>
      splitFlat.find((f) => re.test(f.label))?.value ?? "";
    const change = find(/^change$/i);
    const headline: CompanyHeadline = {
      lastPrice: find(/last trading price/i) || find(/closing price/i),
      change,
      changePct: find(/% change/i),
      direction: change.startsWith("-")
        ? "down"
        : /[1-9]/.test(change)
          ? "up"
          : "flat",
      sector: find(/^sector$/i),
    };

    return { code, name, headline, sections, scrapedAt: new Date().toISOString() };
  });
}

function signed(v: string): string {
  const n = Number(v.replace(/,/g, ""));
  if (Number.isNaN(n) || n === 0) return v;
  return n > 0 ? `+${v}` : v;
}

function signedPct(v: string): string {
  const n = Number(v.replace(/[,%]/g, ""));
  if (Number.isNaN(n) || n === 0) return v;
  return n > 0 ? `+${v}` : v;
}
