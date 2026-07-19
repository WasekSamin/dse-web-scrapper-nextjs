import { notFound } from "next/navigation";
import { isPriceView } from "@/lib/views";
import PricesView from "@/components/views/PricesView";

export default async function PricesPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!isPriceView(view)) notFound();
  return <PricesView view={view} />;
}
