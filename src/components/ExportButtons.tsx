"use client";

import { useRef, useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileType,
  Loader2,
  Clock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Params = Record<string, string>;

// Once an export runs this long, show a "still working" hint (exports scrape
// every listed company, so they can take a while on a slow connection).
const SLOW_HINT_AFTER_SECONDS = 15;

// Order: Excel, then CSV, then PDF.
const ALL_FORMATS = [
  { key: "xlsx", label: "Excel", Icon: FileSpreadsheet },
  { key: "csv", label: "CSV", Icon: FileText },
  { key: "pdf", label: "PDF", Icon: FileType },
] as const;

type FormatKey = (typeof ALL_FORMATS)[number]["key"];

/**
 * Excel / CSV / PDF download buttons. Each hits /api/export with the given
 * source + params and streams a file download. While an export runs, a Cancel
 * button aborts the in-flight request.
 */
export default function ExportButtons({
  source,
  params,
  disabled,
  formats,
}: {
  source: "prices" | "industry" | "company";
  params: Params;
  disabled?: boolean;
  /** Which formats to show; defaults to all (Excel, CSV, PDF). */
  formats?: FormatKey[];
}) {
  const shown = formats
    ? ALL_FORMATS.filter((f) => formats.includes(f.key))
    : ALL_FORMATS;
  const [busy, setBusy] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  async function download(format: string) {
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(format);
    setElapsed(0);
    // Enriched price/sector exports scrape every company (slow) — show a timer.
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    try {
      const qs = new URLSearchParams({ source, format, ...params });
      const res = await fetch(`/api/export?${qs.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        alert(`Export failed: ${msg.error ?? res.statusText}`);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const name =
        disposition.match(/filename="([^"]+)"/)?.[1] ?? `export.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      // A user-triggered cancel aborts the fetch — don't treat it as an error.
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        alert(`Export failed: ${e instanceof Error ? e.message : e}`);
      }
    } finally {
      if (timer) clearInterval(timer);
      controllerRef.current = null;
      setBusy(null);
    }
  }

  function cancel() {
    controllerRef.current?.abort();
  }

  const showSlowHint = busy !== null && elapsed >= SLOW_HINT_AFTER_SECONDS;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Export:</span>
        {shown.map(({ key, label, Icon }) => (
          <Button
            key={key}
            variant="outline"
            size="sm"
            onClick={() => download(key)}
            disabled={disabled || busy !== null}
          >
            {busy === key ? <Loader2 className="animate-spin" /> : <Icon />}
            {busy === key && elapsed > 0 ? `${label} ${elapsed}s` : label}
          </Button>
        ))}
        {busy !== null && (
          <Button variant="destructive" size="sm" onClick={cancel}>
            <X />
            Cancel
          </Button>
        )}
      </div>
      {showSlowHint && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Still working — this export pulls data for every listed company, so
            it can take up to a minute depending on your network speed. You can
            cancel anytime.
          </span>
        </p>
      )}
    </div>
  );
}
