import { z } from "zod";
import { PRICE_VIEW_KEYS, type PriceView } from "@/lib/views";

// ---- Input validation ----

export const priceViewSchema = z.enum(
  PRICE_VIEW_KEYS as [PriceView, ...PriceView[]]
);

export const areaSchema = z
  .string()
  .regex(/^\d+$/, "Area must be a numeric id");

export const tradingCodeSchema = z
  .string()
  .trim()
  .min(1, "Trading code is required")
  .max(30)
  .transform((s) => s.toUpperCase())
  .refine((s) => /^[A-Z0-9.]+$/.test(s), "Invalid trading code");

export const marketSchema = z.enum(["main", "sme", "atb"]);

export const exportFormatSchema = z.enum(["csv", "xlsx", "pdf"]);

export const exportQuerySchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("prices"),
    view: priceViewSchema,
    format: exportFormatSchema,
  }),
  z.object({
    source: z.literal("industry"),
    area: areaSchema,
    format: exportFormatSchema,
  }),
  z.object({
    source: z.literal("company"),
    code: tradingCodeSchema,
    format: exportFormatSchema,
    market: marketSchema.optional(),
  }),
]);

// Prewarm accepts the same source+params as an export, minus format — company
// exports carry no per-company enrichment, so only prices/industry apply.
export const prewarmQuerySchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("prices"), view: priceViewSchema }),
  z.object({ source: z.literal("industry"), area: areaSchema }),
]);

// ---- Response shapes (used to validate what the API hands the client) ----

export const scrapedTableSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  codes: z.array(z.string().nullable()),
  scrapedAt: z.string(),
});

export const priceResponseSchema = scrapedTableSchema.extend({
  view: z.string(),
  label: z.string(),
});

export const companyListSchema = z.object({
  companies: z.array(z.object({ code: z.string(), market: marketSchema })),
});

export const industryListSchema = z.object({
  industries: z.array(z.object({ area: z.string(), name: z.string() })),
});

export const industryTableSchema = scrapedTableSchema.extend({
  area: z.string(),
  sectorName: z.string(),
});

export const companyDetailSchema = z.object({
  code: z.string(),
  name: z.string(),
  headline: z.object({
    lastPrice: z.string(),
    change: z.string(),
    changePct: z.string(),
    direction: z.enum(["up", "down", "flat"]),
    sector: z.string(),
  }),
  sections: z.array(
    z.object({
      title: z.string(),
      fields: z.array(z.object({ label: z.string(), value: z.string() })),
    })
  ),
  scrapedAt: z.string(),
});

export type PriceResponse = z.infer<typeof priceResponseSchema>;
export type IndustryList = z.infer<typeof industryListSchema>;
export type IndustryTableResponse = z.infer<typeof industryTableSchema>;
export type CompanyDetailResponse = z.infer<typeof companyDetailSchema>;
