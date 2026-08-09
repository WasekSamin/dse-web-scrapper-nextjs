import { NextRequest, NextResponse } from "next/server";

/**
 * Make the plain website URL (`/prices/<view>`) work in Excel "From Web" /
 * Power Query while browsers still get the normal React page.
 *
 * We identify *real browser page loads* rather than fingerprinting Excel
 * (whose user-agent is unpredictable). A genuine top-level browser navigation
 * sends `Sec-Fetch-Mode: navigate`; Next.js in-app navigation/prefetch sends
 * RSC headers. Excel "From Web" / Power Query does a plain HTTP fetch (mode
 * `cors`/`no-cors`/absent, no RSC header) — so it falls through to the plain
 * HTML <table> from `/api/table/<view>` (defaulting to the full enriched export
 * dataset — the same columns as the website's Export button).
 *
 * Note: Excel does send *some* `sec-fetch-*` headers, so we must match the
 * `navigate` mode specifically, not merely the presence of `sec-fetch-*`.
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
  // A real browser *page load* sends `Sec-Fetch-Mode: navigate`; Next.js in-app
  // navigation / prefetch sends RSC headers. Excel "From Web" / Power Query does
  // an HTTP fetch (mode `cors`/`no-cors`/absent) with no RSC header — so it
  // falls through to the table. We deliberately do NOT treat every `sec-fetch-*`
  // header as a browser, since Excel sends some of those too.
  const isBrowser =
    h.get("sec-fetch-mode") === "navigate" ||
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
