import { NextRequest, NextResponse } from "next/server";

/**
 * Make the plain website URL (`/prices/<view>`) work in Excel "From Web" /
 * Power Query while browsers still get the normal React page.
 *
 * We identify *real browsers* rather than fingerprinting Excel (whose
 * user-agent is unpredictable). Every browser request — a top-level page load
 * AND Next.js's in-app RSC/prefetch fetches — carries `Sec-Fetch-*` headers.
 * Excel / Power Query / other HTTP clients send none of them. So a request
 * without any browser signal is served the plain HTML <table> from
 * `/api/table/<view>` (defaulting to the full enriched export dataset — the
 * same columns as the website's Export button).
 *
 * The enriched flag is passed to the route via the `x-dse-full` request header
 * because query params added during a rewrite are not visible to the handler.
 *
 * Overrides: `?format=excel` forces the table; `?format=page` forces the page.
 */
export function middleware(req: NextRequest) {
  const match = req.nextUrl.pathname.match(/^\/prices\/([^/]+)\/?$/);
  if (!match) return NextResponse.next();

  const force = req.nextUrl.searchParams.get("format");
  const h = req.headers;
  const isBrowser =
    h.has("sec-fetch-mode") ||
    h.has("sec-fetch-dest") ||
    h.has("rsc") ||
    h.has("next-router-prefetch") ||
    h.has("next-router-state-tree");

  if (force === "page" || (isBrowser && force !== "excel")) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = `/api/table/${match[1]}`;

  // Default to the full enriched export unless the caller opts out (?full=0).
  const full = req.nextUrl.searchParams.get("full") !== "0";
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-dse-full", full ? "1" : "0");

  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  matcher: "/prices/:view",
};
