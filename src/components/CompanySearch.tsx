"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCompanyList } from "@/hooks/useDseData";
import { cn } from "@/lib/utils";

const MAX_SUGGESTIONS = 8;

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
  const codes = data?.companies ?? [];

  const [query, setQuery] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only compute suggestions once the user pauses typing ("after finish typing").
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 220);
    return () => clearTimeout(t);
  }, [query]);

  const matches = useMemo(() => {
    const q = debounced.trim().toUpperCase();
    if (!q) return [];
    const hits = codes.filter((c) => c.includes(q));
    // Codes that start with the query rank first.
    hits.sort((a, b) => {
      const as = a.startsWith(q) ? 0 : 1;
      const bs = b.startsWith(q) ? 0 : 1;
      return as - bs || a.localeCompare(b);
    });
    return hits.slice(0, MAX_SUGGESTIONS);
  }, [codes, debounced]);

  useEffect(() => setHighlight(-1), [debounced]);

  function select(code: string) {
    setQuery(code);
    setOpen(false);
    router.push(`/company/${encodeURIComponent(code)}`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (open && highlight >= 0 && matches[highlight]) {
      select(matches[highlight]);
      return;
    }
    const c = query.trim().toUpperCase();
    if (c) select(c);
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
          {/* Left icon becomes a spinner while the company list is loading. */}
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
              // Delay so a click on a suggestion still registers.
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
                // Keep focus so onBlur doesn't fire before the click.
                e.preventDefault();
                if (blurTimer.current) clearTimeout(blurTimer.current);
              }}
            >
              {matches.map((code, i) => (
                <li key={code}>
                  <button
                    type="button"
                    onClick={() => select(code)}
                    onMouseEnter={() => setHighlight(i)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left",
                      i === highlight
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/60"
                    )}
                  >
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{code}</span>
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
