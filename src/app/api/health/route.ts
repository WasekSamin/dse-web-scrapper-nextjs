import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Lightweight health check for deploy platforms (no scraping). */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
