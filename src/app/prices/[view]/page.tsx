import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isPriceView, type PriceView } from "@/lib/views";
import { PRICE_VIEWS } from "@/lib/scraper/prices";
import PricesView from "@/components/views/PricesView";
import { resolvePriceDataset, enrichDataset } from "@/lib/dataset";

// Live data; the embedded table enriches every company (~40s uncached), so give
// it room. On Render (long-running Node server) this streams fine.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function PricesPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!isPriceView(view)) notFound();

  return (
    <>
      {/* Interactive website UI (renders immediately). */}
      <PricesView view={view} />

      {/* A real, server-rendered <table> embedded in the page HTML so Excel
          "From Web" / Power Query can read the data at this SAME URL. It is
          visually hidden (off-screen, not display:none, so every HTML-table
          parser still enumerates it) and streamed via <Suspense> so the ~40s
          enrichment scrape does not block the interactive UI above. */}
      <Suspense fallback={null}>
        <ExcelData view={view} />
      </Suspense>
    </>
  );
}

async function ExcelData({ view }: { view: PriceView }) {
  let data = await resolvePriceDataset(view);
  data = await enrichDataset(data, PRICE_VIEWS[view].market);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-99999px",
        top: 0,
        width: "1px",
        height: "1px",
        overflow: "hidden",
      }}
    >
      <table id="dse-data">
        <caption>
          {PRICE_VIEWS[view].label} — DSE Share Prices (scraped {data.scrapedAt})
        </caption>
        <thead>
          <tr>
            {data.headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
