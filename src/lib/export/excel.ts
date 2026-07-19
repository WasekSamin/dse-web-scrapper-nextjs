import ExcelJS from "exceljs";
import type { CompanyDetail } from "@/lib/types";

/** Build an .xlsx workbook (as a Buffer) from headers + rows. */
export async function toExcel(
  headers: string[],
  rows: string[][],
  sheetName = "Data"
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DSE Web Scrapper";
  wb.created = new Date();

  // Excel sheet names max 31 chars and disallow some characters.
  const safeName = sheetName.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Data";
  const ws = wb.addWorksheet(safeName);

  ws.addRow(headers);
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F6F43" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  rows.forEach((r) => ws.addRow(r));

  // Auto-size columns based on the longest cell in each column.
  ws.columns.forEach((col, i) => {
    let max = headers[i]?.length ?? 10;
    rows.forEach((r) => {
      const len = (r[i] ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(Math.max(max + 2, 8), 40);
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

const HEADER_FILL = "FF1F6F43";

/** Company export: a titled sheet with a section-grouped Field/Value layout. */
export async function companyToExcel(detail: CompanyDetail): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DSE Web Scrapper";
  wb.created = new Date();
  const ws = wb.addWorksheet(detail.code.slice(0, 31) || "Company");
  ws.columns = [{ width: 34 }, { width: 40 }];

  // Title + headline summary.
  const title = ws.addRow([`${detail.name} (${detail.code})`]);
  ws.mergeCells(title.number, 1, title.number, 2);
  title.font = { bold: true, size: 14 };
  title.height = 20;

  const h = detail.headline;
  const summary = ws.addRow([
    `${h.sector} · LTP ${h.lastPrice} · ${h.change} (${h.changePct})`,
  ]);
  ws.mergeCells(summary.number, 1, summary.number, 2);
  summary.font = { color: { argb: "FF6B7280" } };
  ws.addRow([]);

  for (const section of detail.sections) {
    const head = ws.addRow([section.title]);
    ws.mergeCells(head.number, 1, head.number, 2);
    head.font = { bold: true, color: { argb: "FFFFFFFF" } };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };

    for (const f of section.fields) {
      const r = ws.addRow([f.label, f.value]);
      r.getCell(1).font = { color: { argb: "FF4B5563" } };
      r.getCell(2).alignment = { horizontal: "right" };
    }
    ws.addRow([]);
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
