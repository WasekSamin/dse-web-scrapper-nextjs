import { NextResponse } from "next/server";
import { getCompany } from "@/lib/scraper/company";
import { tradingCodeSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const parsed = tradingCodeSchema.safeParse(code);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid trading code" }, { status: 400 });
  }

  try {
    const detail = await getCompany(parsed.data);
    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scrape failed" },
      { status: 502 }
    );
  }
}
