import { NextRequest, NextResponse } from "next/server";

// Excel "From Web" / Power Query identify themselves via one of these markers.
// The legacy From Web engine uses IE (Trident/MSIE); the modern Power Query
// connector uses a Microsoft.Data.Mashup user-agent. We match broadly.
const EXCEL_UA = /Mashup|Microsoft\.Data|MSIE|Trident|PowerQuery|Excel|Office/i;

/**
 * When Excel (not a browser) requests /prices/<view>, transparently serve the
 * plain HTML <table> from /api/table/<view> instead of the JS-rendered React
 * page. Browsers get the normal page. This lets the client paste the SAME URL
 * they browse. If the user-agent sniff ever misses, append ?format=excel.
 */
export function middleware(req: NextRequest) {
  const match = req.nextUrl.pathname.match(/^\/prices\/([^/]+)\/?$/);
  if (!match) return NextResponse.next();

  const ua = req.headers.get("user-agent") || "";
  const forced = req.nextUrl.searchParams.get("format") === "excel";
  if (!forced && !EXCEL_UA.test(ua)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/api/table/${match[1]}`;
  url.search = "";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: "/prices/:view",
};
