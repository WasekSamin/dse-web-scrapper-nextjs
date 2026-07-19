import { NextResponse } from "next/server";
import { getPriceTable, PRICE_VIEWS } from "@/lib/scraper/prices";
import { priceViewSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ view: string }> }
) {
  const { view } = await params;

  const parsed = priceViewSchema.safeParse(view);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Unknown view "${view}"`, views: Object.keys(PRICE_VIEWS) },
      { status: 400 }
    );
  }

  try {
    const table = await getPriceTable(parsed.data);
    return NextResponse.json({
      view: parsed.data,
      label: PRICE_VIEWS[parsed.data].label,
      ...table,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scrape failed" },
      { status: 502 }
    );
  }
}
