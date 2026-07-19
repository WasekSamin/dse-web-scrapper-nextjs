import CompanySearch from "@/components/CompanySearch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CompanyLookupPage() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Company Lookup</CardTitle>
        <CardDescription>
          Enter a trading code to view its market data and financials, or click a
          code from any price table.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CompanySearch className="w-full" />
      </CardContent>
    </Card>
  );
}
