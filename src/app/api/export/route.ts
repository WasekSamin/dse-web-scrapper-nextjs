import { getPriceTable, PRICE_VIEWS } from "@/lib/scraper/prices";
import { getIndustryTable } from "@/lib/scraper/industry";
import { getCompany } from "@/lib/scraper/company";
import { getEnrichedRows } from "@/lib/scraper/enriched";
import { toCsv, companyToCsv } from "@/lib/export/csv";
import { toExcel, companyToExcel } from "@/lib/export/excel";
import { toPdf, companyToPdf } from "@/lib/export/pdf";
import { enrichedHeaders, enrichedCells } from "@/lib/export/detailed";
import { exportQuerySchema } from "@/lib/schemas";
import type { z } from "zod";

export const dynamic = "force-dynamic";
// CSV/Excel exports enrich every company from its detail page — allow time.
export const maxDuration = 300;

type ExportQuery = z.infer<typeof exportQuerySchema>;

interface Dataset {
  title: string;
  filename: string;
  headers: string[];
  rows: string[][];
  codes: (string | null)[];
  scrapedAt: string;
}

/** Strip trailing footnote asterisks (LTP*, CLOSEP*, YCP*) for cleaner exports. */
function cleanHeader(h: string): string {
  return h.replace(/\s*\*+$/, "");
}

/** Resolve a validated prices/industry query into a flat table (with codes). */
async function resolveDataset(
  q: Extract<ExportQuery, { source: "prices" | "industry" }>
): Promise<Dataset> {
  if (q.source === "prices") {
    const t = await getPriceTable(q.view);
    return {
      title: `DSE Share Prices — ${PRICE_VIEWS[q.view].label}`,
      filename: `dse-prices-${q.view}`,
      headers: t.headers.map(cleanHeader),
      rows: t.rows,
      codes: t.codes,
      scrapedAt: t.scrapedAt,
    };
  }

  const t = await getIndustryTable(q.area);
  return {
    title: `DSE Share Prices — ${t.sectorName}`,
    filename: `dse-industry-${q.area}`,
    headers: t.headers.map(cleanHeader),
    rows: t.rows,
    codes: t.codes,
    scrapedAt: t.scrapedAt,
  };
}

/**
 * Append the per-company enrichment columns (outstanding securities, 52-week
 * range, free-float cap, shareholding %) to each base row, matched by code.
 */
async function enrichDataset(data: Dataset): Promise<Dataset> {
  const codes = data.codes.filter((c): c is string => Boolean(c));
  const enriched = await getEnrichedRows(codes);
  const byCode = new Map(enriched.map((r) => [r.code, r]));

  return {
    ...data,
    headers: [...data.headers, ...enrichedHeaders()],
    rows: data.rows.map((row, i) => [
      ...row,
      ...enrichedCells(byCode.get(data.codes[i] ?? "")),
    ]),
  };
}

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
      const c = await getCompany(q.code);
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

  let data: Dataset;
  try {
    data = await resolveDataset(q);
    // Every format carries the full merged column set (CSV, Excel and PDF).
    data = await enrichDataset(data);
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
