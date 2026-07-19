"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Mobile navigation: a hamburger button (beside the logo) that opens a sidebar
 * drawer sliding in from the left. The drawer is rendered through a portal to
 * <body> so it escapes the sticky header's stacking context and always layers
 * above the page. Hidden on desktop (sm+).
 */
export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close on route change.
  useEffect(() => setOpen(false), [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const drawer = (
    <div
      className={cn(
        "fixed inset-0 z-[100] sm:hidden",
        open ? "" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col bg-background shadow-xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Image
            src="/logo.png"
            alt="DSE Scrapper"
            width={572}
            height={117}
            className="h-7 w-auto"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {NAV_LINKS.map((l) => {
            const active = pathname.startsWith(l.match);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mounted && createPortal(drawer, document.body)}
    </div>
  );
}
