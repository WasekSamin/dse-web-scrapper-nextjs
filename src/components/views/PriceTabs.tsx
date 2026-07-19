"use client";

import Link from "next/link";
import { PRICE_VIEWS, PRICE_VIEW_KEYS } from "@/lib/views";
import { cn } from "@/lib/utils";

/** Route-based tabs styled like shadcn TabsList, one per share-price view. */
export default function PriceTabs({ current }: { current: string }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1">
      {PRICE_VIEW_KEYS.map((key) => {
        const active = key === current;
        return (
          <Link
            key={key}
            href={`/prices/${key}`}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-all",
              active
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {PRICE_VIEWS[key].label}
          </Link>
        );
      })}
    </div>
  );
}
