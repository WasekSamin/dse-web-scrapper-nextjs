import { NextResponse } from "next/server";
import { getCompany } from "@/lib/scraper/company";
import { tradingCodeSchema } from "@/lib/schemas";
import { normalizeMarket } from "@/lib/markets";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const market = normalizeMarket(new URL(req.url).searchParams.get("market"));

  const parsed = tradingCodeSchema.safeParse(code);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid trading code" }, { status: 400 });
  }

  try {
    const detail = await getCompany(parsed.data, market);
    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scrape failed" },
      { status: 502 }
    );
  }
}
