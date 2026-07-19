"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Desktop navigation (hidden on small screens — see MobileNav). */
export default function MainNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 text-sm sm:flex">
      {NAV_LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition-colors",
            pathname.startsWith(l.match)
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
