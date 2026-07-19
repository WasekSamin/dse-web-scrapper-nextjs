import {
  companyDetailSchema,
  companyListSchema,
  industryListSchema,
  industryTableSchema,
  priceResponseSchema,
  type CompanyDetailResponse,
  type IndustryList,
  type IndustryTableResponse,
  type PriceResponse,
} from "@/lib/schemas";
import type { z } from "zod";
import type { ZodType } from "zod";

/** Fetch JSON from an API route and validate it against a Zod schema. */
async function getJson<T>(url: string, schema: ZodType<T>): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new Error("Unexpected response shape from server");
  }
  return parsed.data;
}

export function fetchPrices(view: string): Promise<PriceResponse> {
  return getJson(`/api/prices/${encodeURIComponent(view)}`, priceResponseSchema);
}

export function fetchIndustries(): Promise<IndustryList> {
  return getJson(`/api/industry`, industryListSchema);
}

export function fetchIndustryTable(area: string): Promise<IndustryTableResponse> {
  return getJson(
    `/api/industry?area=${encodeURIComponent(area)}`,
    industryTableSchema
  );
}

export function fetchCompany(code: string): Promise<CompanyDetailResponse> {
  return getJson(
    `/api/company/${encodeURIComponent(code)}`,
    companyDetailSchema
  );
}

export function fetchCompanyList(): Promise<z.infer<typeof companyListSchema>> {
  return getJson(`/api/companies`, companyListSchema);
}
