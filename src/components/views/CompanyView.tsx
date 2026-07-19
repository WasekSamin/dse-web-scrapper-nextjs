"use client";

import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Building2,
  Coins,
  ExternalLink,
  Info,
  Landmark,
  LineChart,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useCompany } from "@/hooks/useDseData";
import CompanySearch from "@/components/CompanySearch";
import ExportButtons from "@/components/ExportButtons";
import { ErrorState } from "@/components/views/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<string, LucideIcon> = {
  Price: LineChart,
  "Trading Activity": Activity,
  "Market Cap & Capital": Landmark,
  "Dividend & Reserves": Coins,
  "Company Profile": Building2,
  "Filings & Links": ExternalLink,
  Other: Info,
};

function isUrl(v: string) {
  return /^https?:\/\//i.test(v);
}

export default function CompanyView({ code }: { code: string }) {
  const { data, isLoading, isError, error } = useCompany(code);
  const dir = data?.headline.direction ?? "flat";

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 text-muted-foreground"
        >
          <Link href="/prices/latest">
            <ArrowLeft />
            Back to prices
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CompanySearch initial={code} className="w-full sm:max-w-sm" />
          {data && <ExportButtons source="company" params={{ code }} />}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-5">
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}
      {isError && (
        <ErrorState message={error instanceof Error ? error.message : "Failed"} />
      )}

      {data && (
        <>
          {/* Hero */}
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {data.code}
                  </h1>
                  {data.headline.sector && (
                    <Badge variant="secondary">{data.headline.sector}</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{data.name}</p>
              </div>

              <div className="flex items-end gap-4">
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Last Traded Price
                  </p>
                  <p className="text-4xl font-bold tabular-nums">
                    {data.headline.lastPrice || "—"}
                  </p>
                </div>
                {(data.headline.change || data.headline.changePct) && (
                  <div
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold",
                      dir === "up" && "bg-emerald-50 text-emerald-700",
                      dir === "down" && "bg-red-50 text-red-700",
                      dir === "flat" && "bg-muted text-muted-foreground"
                    )}
                  >
                    {dir === "up" && <TrendingUp className="h-4 w-4" />}
                    {dir === "down" && <TrendingDown className="h-4 w-4" />}
                    <span className="tabular-nums">
                      {data.headline.change} ({data.headline.changePct})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Section cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.sections.map((section) => {
              const Icon = SECTION_ICONS[section.title] ?? Info;
              return (
                <Card key={section.title} className="flex flex-col">
                  <CardHeader className="flex-row items-center gap-2 space-y-0 border-b py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 p-0">
                    <dl className="divide-y text-sm">
                      {section.fields.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-start justify-between gap-3 px-4 py-2"
                        >
                          <dt className="text-muted-foreground">{f.label}</dt>
                          <dd className="max-w-[60%] text-right font-medium tabular-nums">
                            {isUrl(f.value) ? (
                              <a
                                href={f.value}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                View <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              f.value
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Scraped {new Date(data.scrapedAt).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}
