import { NextResponse } from "next/server";
import { getPriceTable } from "@/lib/scraper/prices";

export const dynamic = "force-dynamic";

/**
 * Lightweight list of all tradeable trading codes (for the lookup typeahead).
 * Sourced from the full "by trade code" board and cached upstream (~30s).
 */
export async function GET() {
  try {
    const table = await getPriceTable("latest");
    const codes = Array.from(
      new Set(table.codes.filter((c): c is string => Boolean(c)))
    ).sort();
    return NextResponse.json({ companies: codes });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load companies" },
      { status: 502 }
    );
  }
}
