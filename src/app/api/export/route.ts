import { PRICE_VIEWS } from "@/lib/scraper/prices";
import { getCompany } from "@/lib/scraper/company";
import { toCsv, companyToCsv } from "@/lib/export/csv";
import { toExcel, companyToExcel } from "@/lib/export/excel";
import { toPdf, companyToPdf } from "@/lib/export/pdf";
import { exportQuerySchema } from "@/lib/schemas";
import {
  resolvePriceDataset,
  resolveIndustryDataset,
  enrichDataset,
  type Dataset,
} from "@/lib/dataset";
import type { Market } from "@/lib/markets";

export const dynamic = "force-dynamic";
// CSV/Excel exports enrich every company from its detail page — allow time.
export const maxDuration = 300;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const parsed = exportQuerySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid export request",
        details: parsed.error.flatten().fieldErrors,
      }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const q = parsed.data;
  const format = q.format;

  // Company exports use dedicated, section-aware builders.
  if (q.source === "company") {
    try {
      const c = await getCompany(q.code, q.market ?? "main");
      const filename = `dse-company-${q.code}`;
      if (format === "csv")
        return fileResponse(companyToCsv(c), `${filename}.csv`, "text/csv; charset=utf-8");
      if (format === "xlsx")
        return fileResponse(
          await companyToExcel(c),
          `${filename}.xlsx`,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
      return fileResponse(await companyToPdf(c), `${filename}.pdf`, "application/pdf");
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Export failed" }),
        { status: 502, headers: { "content-type": "application/json" } }
      );
    }
  }

  // Prices boards may be a non-main market (SME/ATB); industry is main only.
  const market: Market =
    q.source === "prices" ? PRICE_VIEWS[q.view].market : "main";

  let data: Dataset;
  try {
    data =
      q.source === "prices"
        ? await resolvePriceDataset(q.view)
        : await resolveIndustryDataset(q.area);
    // Every format carries the full merged column set (CSV, Excel and PDF).
    data = await enrichDataset(data, market);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Scrape failed" }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }

  try {
    if (format === "csv") {
      return fileResponse(
        toCsv(data.headers, data.rows),
        `${data.filename}.csv`,
        "text/csv; charset=utf-8"
      );
    }
    if (format === "xlsx") {
      const buf = await toExcel(data.headers, data.rows, data.title);
      return fileResponse(
        buf,
        `${data.filename}.xlsx`,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    }
    if (format === "pdf") {
      const buf = await toPdf(data.title, data.headers, data.rows, data.scrapedAt);
      return fileResponse(buf, `${data.filename}.pdf`, "application/pdf");
    }
    return new Response(
      JSON.stringify({ error: `Unknown format "${format}"` }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Export failed" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

function fileResponse(
  body: string | Buffer,
  filename: string,
  contentType: string
): Response {
  return new Response(body as BodyInit, {
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
