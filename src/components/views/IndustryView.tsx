"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { useIndustries, useIndustryTable } from "@/hooks/useDseData";
import DataTable from "@/components/DataTable";
import ExportButtons from "@/components/ExportButtons";
import { ErrorState, SlowExportHint, TableSkeleton } from "@/components/views/states";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export default function IndustryView({ area }: { area?: string }) {
  const router = useRouter();
  const [slowExport, setSlowExport] = useState(false);
  const { data: industries, isLoading: sectorsLoading } = useIndustries();
  const {
    data: table,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useIndustryTable(area);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Share Prices by Sector
          </h1>
          {table && (
            <p className="text-sm text-muted-foreground">
              {table.sectorName} · {table.rows.length} securities
            </p>
          )}
        </div>
        {table && (
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
              source="industry"
              params={{ area: area! }}
              onSlowChange={setSlowExport}
            />
          </div>
        )}
      </div>

      <div className="w-full max-w-xs">
        {sectorsLoading ? (
          <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading sectors…
          </div>
        ) : (
          <Select
            value={area ?? ""}
            onValueChange={(v) => router.push(`/industry?area=${v}`)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a sector…" />
            </SelectTrigger>
            <SelectContent>
              {(industries?.industries ?? []).map((i) => (
                <SelectItem key={i.area} value={i.area}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {slowExport && <SlowExportHint />}

      {!area && (
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            Choose a sector above to view its listed securities.
          </CardContent>
        </Card>
      )}

      {area && isLoading && <TableSkeleton />}
      {area && isError && (
        <ErrorState message={error instanceof Error ? error.message : "Failed"} />
      )}
      {table && (
        <DataTable
          headers={table.headers}
          rows={table.rows}
          codes={table.codes}
        />
      )}
    </div>
  );
}
