"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  headers: string[];
  rows: string[][];
  /** Trading code per row (aligned to rows) → renders a link to /company/CODE. */
  codes?: (string | null)[];
  /** Which header label holds the trading code (to linkify that cell). */
  codeColumn?: string;
  /** Market the codes belong to (adds ?market= to company links). */
  market?: string;
}

function toNumber(v: string): number | null {
  const n = Number(v.replace(/,/g, "").replace(/[^0-9.\-]/g, ""));
  return v.trim() !== "" && !Number.isNaN(n) ? n : null;
}

/** Colour +/- CHANGE and % CHANGE cells. */
function changeClass(value: string): string {
  const n = toNumber(value);
  if (n === null || n === 0) return "text-muted-foreground";
  return n > 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium";
}

export default function DataTable({
  headers,
  rows,
  codes,
  codeColumn = "TRADING CODE",
  market = "main",
}: Props) {
  const marketQs = market !== "main" ? `?market=${market}` : "";
  const [query, setQuery] = useState("");
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [asc, setAsc] = useState(true);

  const codeIdx = headers.findIndex(
    (h) => h.toUpperCase() === codeColumn.toUpperCase()
  );
  const changeIdxs = useMemo(
    () =>
      headers
        .map((h, i) => (/change/i.test(h) ? i : -1))
        .filter((i) => i >= 0),
    [headers]
  );

  const filtered = useMemo(() => {
    let out = rows.map((r, i) => ({ row: r, code: codes?.[i] ?? null }));

    const q = query.trim().toLowerCase();
    if (q) out = out.filter((r) => r.row.some((c) => c.toLowerCase().includes(q)));

    if (sortCol !== null) {
      out = [...out].sort((a, b) => {
        const av = a.row[sortCol] ?? "";
        const bv = b.row[sortCol] ?? "";
        const an = toNumber(av);
        const bn = toNumber(bv);
        const cmp =
          an !== null && bn !== null ? an - bn : av.localeCompare(bv);
        return asc ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, codes, query, sortCol, asc]);

  function sortBy(i: number) {
    if (sortCol === i) setAsc((a) => !a);
    else {
      setSortCol(i);
      setAsc(true);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code, price…"
            className="pl-8"
          />
        </div>
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {filtered.length} / {rows.length} rows
        </span>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {headers.map((h, i) => (
                <TableHead
                  key={i}
                  onClick={() => sortBy(i)}
                  className="cursor-pointer select-none whitespace-nowrap text-foreground hover:text-primary"
                >
                  <span className="inline-flex items-center gap-1">
                    {h}
                    {sortCol === i ? (
                      asc ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />
                    )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r, ri) => (
              <TableRow key={ri}>
                {r.row.map((cell, ci) => (
                  <TableCell
                    key={ci}
                    className={cn(
                      "whitespace-nowrap",
                      changeIdxs.includes(ci) && changeClass(cell)
                    )}
                  >
                    {ci === codeIdx && r.code ? (
                      <Link
                        href={`/company/${encodeURIComponent(r.code)}${marketQs}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {cell}
                      </Link>
                    ) : (
                      cell
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={headers.length}
                  className="py-10 text-center text-muted-foreground"
                >
                  No matching rows.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
