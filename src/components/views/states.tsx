import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

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
