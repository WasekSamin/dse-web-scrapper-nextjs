// Build a CSV string from headers + rows. Escapes quotes, commas and newlines.

function escapeCell(value: string): string {
  const v = value ?? "";
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCell).join(",")
  );
  // Prepend BOM so Excel opens UTF-8 correctly.
  return "﻿" + lines.join("\r\n");
}

import type { CompanyDetail } from "@/lib/types";

/** Company export: Section, Field, Value grouped in section order. */
export function companyToCsv(detail: CompanyDetail): string {
  const rows: string[][] = [];
  for (const s of detail.sections) {
    for (const f of s.fields) rows.push([s.title, f.label, f.value]);
  }
  return toCsv(["Section", "Field", "Value"], rows);
}
