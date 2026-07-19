import { AlertCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/** Highlighted badge shown while a slow (enriched) export is running. */
export function SlowExportHint() {
  return (
    <div className="inline-flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900 shadow-sm">
      <Clock className="mt-0.5 h-4 w-4 shrink-0 animate-pulse" />
      <span>
        Still working — this export pulls data for every listed company, so it
        can take up to a minute depending on your network speed. You can cancel
        anytime.
      </span>
    </div>
  );
}

export function TableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-full max-w-xs" />
      <div className="rounded-lg border bg-card p-4">
        <Skeleton className="mb-3 h-8 w-full" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-6 w-full" />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex items-start gap-3 p-4 text-destructive">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">Couldn&apos;t load data</p>
          <p className="text-sm opacity-90">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
