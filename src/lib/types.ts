// Shared types for scraped DSE data.

/** A generic, header-driven table: column order preserved in `headers`. */
export interface ScrapedTable {
  /** Column headers in display order, e.g. ["#", "TRADING CODE", "LTP*", ...]. */
  headers: string[];
  /** Each row is an ordered array of cell strings aligned to `headers`. */
  rows: string[][];
  /** Trading code per row (from the displayCompany link), aligned to `rows`. */
  codes: (string | null)[];
  /** When the data was scraped (ISO string). */
  scrapedAt: string;
}

/** One label/value pair from a company detail section. */
export interface CompanyField {
  label: string;
  value: string;
}

/** A named group of fields on the company detail page. */
export interface CompanySection {
  title: string;
  fields: CompanyField[];
}

/** Key headline stats shown in the company hero card. */
export interface CompanyHeadline {
  lastPrice: string;
  change: string;
  changePct: string;
  direction: "up" | "down" | "flat";
  sector: string;
}

/** Structured company detail page. */
export interface CompanyDetail {
  code: string;
  name: string;
  headline: CompanyHeadline;
  sections: CompanySection[];
  scrapedAt: string;
}

/** A selectable DSE industry/sector (for the industry page `area` param). */
export interface Industry {
  area: string;
  name: string;
}

export type ExportFormat = "csv" | "xlsx" | "pdf";
