import { BarChart3, Layers, Search, type LucideIcon } from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  /** Path prefix used to mark the link active. */
  match: string;
  icon: LucideIcon;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/prices/latest", label: "Share Prices", match: "/prices", icon: BarChart3 },
  { href: "/industry", label: "By Sector", match: "/industry", icon: Layers },
  { href: "/company", label: "Company Lookup", match: "/company", icon: Search },
];
