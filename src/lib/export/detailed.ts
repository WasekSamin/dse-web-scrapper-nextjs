import type { EnrichedRow } from "@/lib/scraper/enriched";

// Extra per-company columns appended to a share-price export. The base table
// already carries TRADING CODE and VOLUME, so those are not repeated here.
const MAX_PERIODS = 3;

const EXTRA_BASE_HEADERS = [
  "Total No. of Outstanding Securities",
  "52 Weeks' Moving Range",
  "Free Float Market Cap. (mn)",
];

// Per-period shareholding columns. The first column holds the "as-on" date, so
// it must NOT be labelled "Share Holding Percentage". Each column is prefixed
// with the period number so the three blocks are unambiguous in a flat CSV.
const HOLDER_HEADERS = [
  "As-On Date",
  "Sponsor/Director (%)",
  "Govt (%)",
  "Institute (%)",
  "Foreign (%)",
  "Public (%)",
];

/** Extra column headers (base extras + 3 labelled shareholding blocks). */
export function enrichedHeaders(): string[] {
  const headers = [...EXTRA_BASE_HEADERS];
  for (let p = 1; p <= MAX_PERIODS; p++) {
    for (const h of HOLDER_HEADERS) headers.push(`Shareholding ${p} - ${h}`);
  }
  return headers;
}

const EXTRA_WIDTH = EXTRA_BASE_HEADERS.length + MAX_PERIODS * HOLDER_HEADERS.length;

/** Extra cells for one company, aligned to enrichedHeaders(). */
export function enrichedCells(row: EnrichedRow | undefined): string[] {
  if (!row) return Array<string>(EXTRA_WIDTH).fill("");
  const cells = [row.outstandingSecurities, row.movingRange52w, row.freeFloatCap];
  for (let p = 0; p < MAX_PERIODS; p++) {
    const sh = row.shareholding[p];
    if (sh) {
      cells.push(
        sh.asOn,
        sh.sponsorDirector,
        sh.govt,
        sh.institute,
        sh.foreign,
        sh.public
      );
    } else {
      cells.push("", "", "", "", "", "");
    }
  }
  return cells;
}
