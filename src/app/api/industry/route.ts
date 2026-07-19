import { NextResponse } from "next/server";
import { getIndustries, getIndustryTable } from "@/lib/scraper/industry";
import { areaSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const areaParam = new URL(req.url).searchParams.get("area");

  try {
    // No area → return the list of sectors for the selector.
    if (!areaParam) {
      return NextResponse.json({ industries: await getIndustries() });
    }

    const parsed = areaSchema.safeParse(areaParam);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid area id" }, { status: 400 });
    }

    const table = await getIndustryTable(parsed.data);
    return NextResponse.json({ area: parsed.data, ...table });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scrape failed" },
      { status: 502 }
    );
  }
}
