import { NextResponse } from "next/server";
import { getPriceTable, type PriceView } from "@/lib/scraper/prices";
import type { Market } from "@/lib/markets";

export const dynamic = "force-dynamic";

// Boards to pull trading codes from, each tagged with its market.
const BOARDS: { view: PriceView; market: Market }[] = [
  { view: "latest", market: "main" },
  { view: "sme", market: "sme" },
  { view: "atb", market: "atb" },
];

/**
 * All tradeable trading codes across the main, SME and ATB boards (for the
 * lookup typeahead). Each entry carries its market so duplicates can be
 * disambiguated in the UI.
 */
export async function GET() {
  try {
    const results = await Promise.all(
      BOARDS.map(async ({ view, market }) => {
        try {
          const table = await getPriceTable(view);
          return table.codes
            .filter((c): c is string => Boolean(c))
            .map((code) => ({ code, market }));
        } catch {
          return [];
        }
      })
    );

    const seen = new Set<string>();
    const companies: { code: string; market: Market }[] = [];
    for (const list of results) {
      for (const entry of list) {
        const key = `${entry.market}:${entry.code}`;
        if (!seen.has(key)) {
          seen.add(key);
          companies.push(entry);
        }
      }
    }
    companies.sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({ companies });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load companies" },
      { status: 502 }
    );
  }
}
