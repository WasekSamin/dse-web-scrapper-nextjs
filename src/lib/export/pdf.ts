// Build a PDF (as a Buffer) from headers + rows using pdfmake with its bundled
// Roboto fonts (vfs). Runs server-side inside a route handler.

/* eslint-disable @typescript-eslint/no-explicit-any */

let pdfMakeInstance: { pdfMake: any; vfs: any } | null = null;

// If the font map hasn't loaded within this window, fail fast instead of
// hanging: pdfmake throws asynchronously when a font is missing, and that
// rejection never reaches our try/catch — so getBuffer's callback would
// otherwise never fire and the request would hang forever (observed as an
// 11-minute "still exporting" on the Render production build).
const PDF_RENDER_TIMEOUT_MS = 20_000;

async function getPdfMake(): Promise<{ pdfMake: any; vfs: any }> {
  if (pdfMakeInstance) return pdfMakeInstance;

  const pdfMakeMod: any = await import("pdfmake/build/pdfmake");
  const vfsMod: any = await import("pdfmake/build/vfs_fonts");

  const pdfMake = pdfMakeMod.default ?? pdfMakeMod;

  // pdfmake 0.2.x ships vfs_fonts as `module.exports = <fileMap>` — the
  // { "Roboto-Regular.ttf": "<base64>", ... } object itself, NOT wrapped in
  // `.pdfMake.vfs` / `.vfs`. Its self-registration side-effect only runs when a
  // global `pdfMake` already exists, which happens in `next dev` but NOT in the
  // production standalone bundle — hence PDF export hung only in production. So
  // resolve the map ourselves and pass it explicitly to createPdf().
  const looksLikeFontMap = (o: any) => o && typeof o === "object" && o["Roboto-Regular.ttf"];
  const vfs =
    (looksLikeFontMap(vfsMod?.default) && vfsMod.default) ||
    (looksLikeFontMap(vfsMod) && vfsMod) ||
    // Legacy shapes, kept for other pdfmake versions.
    vfsMod?.pdfMake?.vfs ||
    vfsMod?.default?.pdfMake?.vfs ||
    vfsMod?.vfs ||
    vfsMod?.default?.vfs ||
    null;

  if (!looksLikeFontMap(vfs)) {
    throw new Error("pdfmake fonts (vfs) failed to load — cannot render PDF");
  }

  pdfMakeInstance = { pdfMake, vfs };
  return pdfMakeInstance;
}

export async function toPdf(
  title: string,
  headers: string[],
  rows: string[][],
  scrapedAt: string
): Promise<Buffer> {
  const { pdfMake, vfs } = await getPdfMake();

  // Scale down for wide (enriched) tables so all columns fit the page; share the
  // page width evenly (star widths) so long values wrap instead of overflowing.
  const cols = headers.length;
  const fontSize = cols > 24 ? 4.5 : cols > 16 ? 5.5 : cols > 12 ? 6.5 : 7;
  const wide = cols > 12;

  const body = [
    headers.map((h) => ({ text: h, style: "th" })),
    ...rows.map((r) =>
      headers.map((_, i) => ({ text: r[i] ?? "", style: "td" }))
    ),
  ];

  const docDefinition = {
    pageOrientation: "landscape",
    pageSize: "A4",
    pageMargins: [16, 40, 16, 30],
    defaultStyle: { fontSize },
    content: [
      { text: title, style: "title" },
      {
        text: `Scraped from dsebd.org at ${new Date(scrapedAt).toLocaleString()}`,
        style: "subtitle",
      },
      {
        table: {
          headerRows: 1,
          widths: headers.map(() => (wide ? "*" : "auto")),
          body,
        },
        layout: {
          fillColor: (rowIndex: number) =>
            rowIndex === 0 ? "#1f6f43" : rowIndex % 2 === 0 ? "#f3f4f6" : null,
          paddingLeft: () => (wide ? 2 : 4),
          paddingRight: () => (wide ? 2 : 4),
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
      },
    ],
    styles: {
      title: { fontSize: 14, bold: true, margin: [0, 0, 0, 2] },
      subtitle: { fontSize: 8, color: "#666666", margin: [0, 0, 0, 10] },
      th: { bold: true, color: "#ffffff", fontSize: fontSize + 0.5 },
      td: { fontSize },
    },
  };

  return renderPdf(pdfMake, vfs, docDefinition);
}

import type { CompanyDetail } from "@/lib/types";

/** Company export: portrait page, hero line, one Field/Value table per section. */
export async function companyToPdf(detail: CompanyDetail): Promise<Buffer> {
  const { pdfMake, vfs } = await getPdfMake();
  const h = detail.headline;

  const content: any[] = [
    { text: `${detail.name} (${detail.code})`, style: "title" },
    {
      text: `${h.sector}   ·   LTP ${h.lastPrice}   ·   ${h.change}${h.changePct ? ` (${h.changePct})` : ""}`,
      style: "hero",
    },
    {
      text: `Scraped from dsebd.org at ${new Date(detail.scrapedAt).toLocaleString()}`,
      style: "subtitle",
    },
  ];

  for (const section of detail.sections) {
    content.push({ text: section.title, style: "sectionHead" });
    content.push({
      table: {
        headerRows: 0,
        widths: ["50%", "50%"],
        body: section.fields.map((f) => [
          { text: f.label, style: "label" },
          { text: f.value, style: "value" },
        ]),
      },
      layout: {
        fillColor: (rowIndex: number) => (rowIndex % 2 === 0 ? "#f6f7f8" : null),
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => "#e5e7eb",
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      margin: [0, 0, 0, 12],
    });
  }

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [36, 40, 36, 36],
    content,
    styles: {
      title: { fontSize: 18, bold: true, margin: [0, 0, 0, 2] },
      hero: { fontSize: 11, color: "#1f6f43", bold: true, margin: [0, 0, 0, 2] },
      subtitle: { fontSize: 8, color: "#888888", margin: [0, 0, 0, 14] },
      sectionHead: {
        fontSize: 11,
        bold: true,
        color: "#1f6f43",
        margin: [0, 6, 0, 4],
      },
      label: { fontSize: 9, color: "#555555" },
      value: { fontSize: 9, alignment: "right" },
    },
  };

  return renderPdf(pdfMake, vfs, docDefinition);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function renderPdf(pdfMake: any, vfs: any, docDefinition: any): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    // Pass fonts explicitly (4th arg) rather than relying on global vfs state,
    // which isn't wired up in the production standalone bundle.
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`PDF generation timed out after ${PDF_RENDER_TIMEOUT_MS}ms`));
    }, PDF_RENDER_TIMEOUT_MS);
    try {
      const doc = pdfMake.createPdf(docDefinition, null, null, vfs);
      doc.getBuffer((buf: Uint8Array) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(Buffer.from(buf));
      });
    } catch (err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    }
  });
}
