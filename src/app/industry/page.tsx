import IndustryView from "@/components/views/IndustryView";

export default async function IndustryPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area } = await searchParams;
  const validArea = area && /^\d+$/.test(area) ? area : undefined;
  return <IndustryView area={validArea} />;
}
