"use client";

import { RefreshCw } from "lucide-react";
import { usePrices } from "@/hooks/useDseData";
import { PRICE_VIEWS } from "@/lib/views";
import type { PriceView } from "@/lib/views";
import DataTable from "@/components/DataTable";
import ExportButtons from "@/components/ExportButtons";
import PriceTabs from "@/components/views/PriceTabs";
import { ErrorState, TableSkeleton } from "@/components/views/states";
import { Button } from "@/components/ui/button";

export default function PricesView({ view }: { view: PriceView }) {
  const { data, isLoading, isFetching, isError, error, refetch } =
    usePrices(view);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Share Prices — {PRICE_VIEWS[view].label}
          </h1>
          {data && (
            <p className="text-sm text-muted-foreground">
              {data.rows.length} securities · scraped{" "}
              {new Date(data.scrapedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={isFetching ? "animate-spin" : ""} />
            Refresh
          </Button>
          <ExportButtons
            source="prices"
            params={{ view }}
            disabled={!data}
            formats={["xlsx", "csv"]}
          />
        </div>
      </div>

      <PriceTabs current={view} />

      {isLoading && <TableSkeleton />}
      {isError && (
        <ErrorState message={error instanceof Error ? error.message : "Failed"} />
      )}
      {data && (
        <DataTable headers={data.headers} rows={data.rows} codes={data.codes} />
      )}
    </div>
  );
}
