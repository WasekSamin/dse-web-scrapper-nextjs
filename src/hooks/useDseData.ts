"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchCompany,
  fetchCompanyList,
  fetchIndustries,
  fetchIndustryTable,
  fetchPrices,
} from "@/lib/api";

export function usePrices(view: string) {
  return useQuery({
    queryKey: ["prices", view],
    queryFn: () => fetchPrices(view),
  });
}

export function useIndustries() {
  return useQuery({
    queryKey: ["industries"],
    queryFn: fetchIndustries,
    staleTime: 60 * 60 * 1000, // sectors change rarely
  });
}

export function useIndustryTable(area: string | undefined) {
  return useQuery({
    queryKey: ["industry", area],
    queryFn: () => fetchIndustryTable(area!),
    enabled: Boolean(area),
  });
}

export function useCompanyList() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanyList,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCompany(code: string, market = "main") {
  return useQuery({
    queryKey: ["company", market, code],
    queryFn: () => fetchCompany(code, market),
    enabled: Boolean(code),
  });
}
