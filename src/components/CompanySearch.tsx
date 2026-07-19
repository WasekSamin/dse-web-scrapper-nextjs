"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCompanyList } from "@/hooks/useDseData";
import { MARKETS, type Market } from "@/lib/markets";
import { cn } from "@/lib/utils";

const MAX_SUGGESTIONS = 8;

interface Company {
  code: string;
  market: Market;
}

function companyHref(c: Company): string {
  return `/company/${encodeURIComponent(c.code)}${
    c.market !== "main" ? `?market=${c.market}` : ""
  }`;
}

export default function CompanySearch({
  initial = "",
  className = "max-w-md",
}: {
  initial?: string;
  /** Wrapper width classes; defaults to a compact max width. */
  className?: string;
}) {
  const router = useRouter();
  const { data, isLoading } = useCompanyList();
  const companies = useMemo<Company[]>(
    () => data?.companies ?? [],
    [data]
  );

  // Codes that appear in more than one market → show the market on those.
  const duplicateCodes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of companies) counts.set(c.code, (counts.get(c.code) ?? 0) + 1);
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [companies]);

  const [query, setQuery] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only compute suggestions once the user pauses typing.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 220);
    return () => clearTimeout(t);
  }, [query]);

  const matches = useMemo(() => {
    const q = debounced.trim().toUpperCase();
    if (!q) return [];
    const hits = companies.filter((c) => c.code.includes(q));
    hits.sort((a, b) => {
      const as = a.code.startsWith(q) ? 0 : 1;
      const bs = b.code.startsWith(q) ? 0 : 1;
      return as - bs || a.code.localeCompare(b.code) || a.market.localeCompare(b.market);
    });
    return hits.slice(0, MAX_SUGGESTIONS);
  }, [companies, debounced]);

  useEffect(() => setHighlight(-1), [debounced]);

  function select(c: Company) {
    setQuery(c.code);
    setOpen(false);
    router.push(companyHref(c));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (open && highlight >= 0 && matches[highlight]) {
      select(matches[highlight]);
      return;
    }
    const code = query.trim().toUpperCase();
    if (!code) return;
    // Prefer an exact match; default to main market otherwise.
    const exact =
      companies.find((c) => c.code === code && c.market === "main") ??
      companies.find((c) => c.code === code);
    select(exact ?? { code, market: "main" });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && matches.length > 0;

  return (
    <form onSubmit={submit} className={cn("relative w-full", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          {isLoading ? (
            <Loader2 className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
          ) : (
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setOpen(false), 120);
            }}
            onKeyDown={onKeyDown}
            placeholder={
              isLoading ? "Loading companies…" : "Search trading code, e.g. GP"
            }
            className="pl-8 uppercase"
            autoComplete="off"
            role="combobox"
            aria-expanded={showList}
          />

          {showList && (
            <ul
              className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md"
              onMouseDown={(e) => {
                e.preventDefault();
                if (blurTimer.current) clearTimeout(blurTimer.current);
              }}
            >
              {matches.map((c, i) => (
                <li key={`${c.market}:${c.code}`}>
                  <button
                    type="button"
                    onClick={() => select(c)}
                    onMouseEnter={() => setHighlight(i)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left",
                      i === highlight
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/60"
                    )}
                  >
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{c.code}</span>
                    {duplicateCodes.has(c.code) && (
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        {MARKETS[c.market].label}
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button type="submit">
          <Search />
          Look up
        </Button>
      </div>
    </form>
  );
}
