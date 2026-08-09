import { PRICE_VIEWS } from "@/lib/scraper/prices";
import { priceViewSchema } from "@/lib/schemas";
import { resolvePriceDataset, enrichDataset } from "@/lib/dataset";

export const dynamic = "force-dynamic";
// Enriched tables scrape every company's detail page — allow time.
export const maxDuration = 300;

/** Escape a cell value for safe embedding in HTML. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Plain server-rendered HTML `<table>` endpoint for Excel "From Web" /
 * Power Query. Unlike the React pages, this returns a real <table> in the
 * initial HTML (no JS), so Excel can detect it and its Refresh button will
 * re-pull live data.
 *
 *   /api/table/latest          → the base price board (11 cols, instant)
 *   /api/table/latest?full=1   → the enriched export dataset (32 cols, ~40s):
 *                                same columns as the website's Export button.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ view: string }> }
) {
  const { view } = await params;
  // `full` may arrive as a query param (direct hit) or the x-dse-full request
  // header (set by middleware, since rewrite query isn't visible here).
  const full =
    new URL(req.url).searchParams.get("full") === "1" ||
    req.headers.get("x-dse-full") === "1";

  const parsed = priceViewSchema.safeParse(view);
  if (!parsed.success) {
    const views = Object.keys(PRICE_VIEWS).join(", ");
    return new Response(
      `<!doctype html><html><body><p>Unknown view "${esc(
        view
      )}". Valid views: ${esc(views)}</p></body></html>`,
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  try {
    let data = await resolvePriceDataset(parsed.data);
    if (full) {
      data = await enrichDataset(data, PRICE_VIEWS[parsed.data].market);
    }
    const label = PRICE_VIEWS[parsed.data].label;

    const thead = `<tr>${data.headers
      .map((h) => `<th>${esc(h)}</th>`)
      .join("")}</tr>`;

    const tbody = data.rows
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`
      )
      .join("");

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(label)} — DSE Share Prices</title>
</head>
<body>
<table id="dse-data" border="1">
<caption>${esc(label)}${full ? " (full export)" : ""} (scraped ${esc(
      data.scrapedAt
    )})</caption>
<thead>${thead}</thead>
<tbody>${tbody}</tbody>
</table>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Let Excel/Power Query fetch fresh data on each Refresh.
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Scrape failed";
    return new Response(
      `<!doctype html><html><body><p>Error: ${esc(msg)}</p></body></html>`,
      { status: 502, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
}
