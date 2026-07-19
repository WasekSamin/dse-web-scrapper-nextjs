import CompanyView from "@/components/views/CompanyView";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const clean = decodeURIComponent(code).trim().toUpperCase();
  return <CompanyView code={clean} />;
}
