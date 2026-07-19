import CompanyView from "@/components/views/CompanyView";
import { normalizeMarket } from "@/lib/markets";

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ market?: string }>;
}) {
  const { code } = await params;
  const { market } = await searchParams;
  const clean = decodeURIComponent(code).trim().toUpperCase();
  return <CompanyView code={clean} market={normalizeMarket(market)} />;
}
