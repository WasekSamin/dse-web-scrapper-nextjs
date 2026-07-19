// Client-safe market metadata. DSE runs three boards on separate subdomains,
// each with its own company-detail URL. Kept free of Node-only imports so it can
// be used in client components and Zod schemas.

export type Market = "main" | "sme" | "atb";

export const MARKETS: Record<
  Market,
  {
    label: string;
    /** Company-detail URL for a trading code (absolute for sme/atb). */
    companyUrl: (code: string) => string;
  }
> = {
  main: {
    label: "Main",
    companyUrl: (code) => `/displayCompany.php?name=${encodeURIComponent(code)}`,
  },
  sme: {
    label: "SME",
    companyUrl: (code) =>
      `https://sme.dsebd.org/sme_displayCompany.php?name=${encodeURIComponent(code)}`,
  },
  atb: {
    label: "ATB",
    companyUrl: (code) =>
      `https://atb.dsebd.org/displayCompany.php?name=${encodeURIComponent(code)}`,
  },
};

export function isMarket(v: string): v is Market {
  return v === "main" || v === "sme" || v === "atb";
}

export function normalizeMarket(v: string | null | undefined): Market {
  return v && isMarket(v) ? v : "main";
}
