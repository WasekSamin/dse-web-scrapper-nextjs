# DSE Web Scrapper — Project Documentation

A deep walkthrough of how the project is structured, how data flows from dsebd.org to
the browser, and why the key decisions were made. Read the [README](./README.md) first
for the quick "what/how to run" summary.

---

## 1. What the app does

The Dhaka Stock Exchange publishes live share prices and per‑company data on
[dsebd.org](https://www.dsebd.org) as plain HTML pages — there is no public API. This
app **scrapes those pages on demand**, parses the HTML into structured data, renders it
in a modern UI, and produces downloadable **CSV / Excel / PDF** exports.

There is **no database**. Every request scrapes DSE live; a small in‑memory cache avoids
hammering the source for repeated requests within a few seconds/minutes.

---

## 2. High‑level architecture

```
                                   Browser (client components)
                                   React Query hooks ── fetch ──┐
                                                                 │
  ┌───────────────────────────── Next.js server ────────────────┼──────────────┐
  │                                                              ▼              │
  │  Pages (server shells)            API route handlers (/api/*)              │
  │  /prices/[view]  ─────┐           ├─ prices/[view]                          │
  │  /industry            │  render   ├─ industry            ┐                  │
  │  /company/[code]      ├─ client ─►├─ company/[code]      │                  │
  │  /company             │  views    ├─ companies           │ Zod‑validated    │
  │                       │           ├─ export              │ inputs           │
  │                       │           └─ health              ┘                  │
  │                                          │                                  │
  │                                          ▼                                  │
  │                    lib/scraper/*  ── axios+cheerio ──►  dsebd.org (HTML)    │
  │                          │  (cached in-memory ~30s / ~5min)                 │
  │                          ▼                                                  │
  │                    lib/export/*  ── csv / exceljs / pdfmake ──► file bytes  │
  └───────────────────────────────────────────────────────────────────────────┘
```

**Two ways data reaches the UI:**

1. **Server render + React Query** — page files are thin server shells that read the
   route/query params and hand them to a **client "view" component**. The view calls the
   matching `/api/*` route via a React Query hook, showing a skeleton while loading.
2. **Direct file download** — export buttons `fetch('/api/export?…')` and stream the
   response to a browser download.

---

## 3. Directory map

```
src/
  app/
    layout.tsx                 # Root layout: header (logo + nav), <Providers>, footer
    page.tsx                   # "/" → redirect to /prices/latest
    globals.css                # Tailwind + shadcn CSS variables (theme tokens)
    icon.png / apple-icon.png  # Favicons (auto-detected by Next metadata)

    prices/[view]/page.tsx     # <PricesView> + hidden embedded <table> for Excel (§6a)
    industry/page.tsx          # Server shell → <IndustryView area=…>
    company/page.tsx           # Company lookup landing (search only)
    company/[code]/page.tsx    # Server shell → <CompanyView code=…>

    api/
      prices/[view]/route.ts   # Scrape a price board → JSON
      table/[view]/route.ts    # Same board → plain HTML <table> for Excel (§6a)
      industry/route.ts        # Sector list, or one sector's table → JSON
      company/[code]/route.ts  # Company detail → JSON
      companies/route.ts       # All trading codes (typeahead source) → JSON
      export/route.ts          # Enriched CSV/Excel/PDF file download
      health/route.ts          # { status: "ok" } — deploy health check

  components/
    providers.tsx              # React Query QueryClientProvider
    MainNav.tsx / MobileNav.tsx# Desktop nav / mobile left-drawer (portal)
    DataTable.tsx              # Sortable, searchable table with code links
    ExportButtons.tsx          # CSV/Excel/PDF buttons + cancel + timer
    CompanySearch.tsx          # Debounced typeahead combobox
    views/                     # Client "view" components (fetch + render)
      PricesView.tsx  PriceTabs.tsx  IndustryView.tsx  CompanyView.tsx  states.tsx
    ui/                        # shadcn/ui primitives (button, table, select, …)

  hooks/
    useDseData.ts              # React Query hooks: usePrices, useIndustryTable, …

  lib/
    scraper/
      client.ts                # axios instance (browser UA, relaxed TLS, retry)
      parseTable.ts            # Generic <table.shares-table> → {headers, rows, codes}
      prices.ts                # 8 price views → getPriceTable()
      industry.ts              # Sector list + one sector's table
      company.ts               # displayCompany.php → grouped detail + headline
      enriched.ts              # Per-company shareholding/capital → export enrichment
    export/
      csv.ts   excel.ts   pdf.ts   detailed.ts   # Format builders + merge columns
    api.ts                     # Typed fetchers (validate responses with Zod)
    dataset.ts                 # Shared price/industry dataset + enrichment (export & table)
    schemas.ts                 # Zod schemas: inputs + response shapes
    cache.ts                   # In-memory TTL cache (Map)
    views.ts                   # Client-safe price-view metadata (labels, paths)
    nav.ts                     # Shared nav links (label, href, icon)
    types.ts                   # Shared TS types
    utils.ts                   # cn() classname helper
```

---

## 4. What the DSE pages actually look like (scraping targets)

Everything hinges on three page shapes, confirmed by inspecting the live HTML:

### Group A — the price boards (one shared table)
URLs like `latest_share_price_scroll_l.php`, `…_by_change.php`, etc. are just different
server‑side **sorts/filters of the same data**, all rendered as:

```html
<table class="… shares-table …">
  <thead><tr><th>#</th><th>TRADING CODE</th><th>LTP*</th>…<th>VOLUME</th></tr></thead>
  <tr>
    <td>1</td>
    <td><a href="displayCompany.php?name=GP">GP</a></td>
    <td>257.70</td> … <td>18,586</td>
  </tr>
  …
</table>
```

Columns: `# · TRADING CODE · LTP · HIGH · LOW · CLOSEP · YCP · CHANGE · TRADE ·
VALUE (mn) · VOLUME` (~396 rows). The 8 views map to 8 URLs in `lib/views.ts`.

### Group B — sector board (`ltp_industry.php?area=<id>`)
Same table but the header row lives **directly in the table (no `<thead>`)** and adds
`LTY` and `OAP` columns. The sector name is in the page title
(`… for Business Area: <NAME> on …`). The full sector list is scraped from
`by_industrylisting.php` (which links each sector via `companylistbyindustry.php?industryno=<id>`,
matching the `area` id).

### Group C — company detail (`displayCompany.php?name=<code>`)
One big `#company` table with label/value rows (Last Trading Price, Market Cap, Paid‑up
Capital, EPS, Sector, dividends…), followed by yearly EPS/P‑E matrices, and a
**shareholding‑percentage** block (Sponsor/Director, Govt, Institute, Foreign, Public)
for up to 3 periods. Full company name appears as `Company Name: <…>`.

### Site quirks (critical)
- **Broken TLS chain** → the HTTP client uses an `https.Agent({ rejectUnauthorized: false })`
  (scoped to this host).
- **Blocks default agents** → the client sends a realistic browser `User-Agent`.

Both are handled in `lib/scraper/client.ts`.

---

## 5. The scraping layer (`lib/scraper/`)

- **`client.ts`** — a preconfigured axios instance: base URL, browser UA, relaxed TLS,
  20s timeout, and a 3‑try retry with backoff. `fetchHtml(path)` returns raw HTML.
- **`parseTable.ts`** — `parseSharesTable(html)` finds `table.shares-table`, reads
  headers from `<thead th>` **or** (fallback) the first `<tr>`'s `<th>`, then maps every
  data `<tr>` to a cell array and extracts the trading code from its
  `displayCompany.php?name=` link. **Header‑driven**, so the extra industry columns are
  picked up automatically.
- **`prices.ts`** — `PRICE_VIEWS` (from `views.ts`) → `getPriceTable(view)`.
- **`industry.ts`** — `getIndustries()` (sector list, cached 1h) and
  `getIndustryTable(area)` (table + sector name).
- **`company.ts`** — `getCompany(code)`:
  1. flattens the `#company` label/value rows,
  2. splits the combined `Change` cell into `Change` + `% Change`,
  3. distributes fields into ordered **sections** (Price, Trading Activity, Market Cap &
     Capital, Dividend & Reserves, Company Profile, Filings & Links) via label‑matching
     rules,
  4. builds a **headline** (last price, change, direction, sector) for the hero card.
- **`enriched.ts`** — `getCompanyRow(code)` extracts just the columns needed to enrich an
  export (outstanding securities, 52‑week range, volume, free‑float cap, and the 3
  shareholding periods via regex). `getEnrichedRows(codes)` runs these through a
  **bounded concurrency pool (10 at a time)**; each row is cached ~5 min and never throws
  (a page that fails, e.g. some bonds, yields blanks).

### Caching (`lib/cache.ts`)
A module‑level `Map` with per‑key TTL. `cached(key, producer, ttl)` returns a fresh value
or repopulates. Prices/industry/company: ~30s; sector list: 1h; enrichment: ~5min.
**This cache is per‑process** — it works great on a long‑lived server (Railway) and is
mostly ineffective on serverless (each cold instance is empty).

---

## 6. API routes (`app/api/*`)

Every handler is `dynamic = "force-dynamic"` (scraped per request). Inputs are validated
with **Zod** (`schemas.ts`): `priceViewSchema` (enum), `areaSchema` (numeric),
`tradingCodeSchema` (uppercased, `[A-Z0-9.]`), and `exportQuerySchema` (a discriminated
union over `source`). Invalid input → `400`; scrape failure → `502`.

`export/route.ts` is the most involved (see §8). `export` sets `maxDuration = 300` for
platforms that honour it.

**`table/[view]/route.ts`** returns a **plain server‑rendered HTML `<table>`** (no JS) for
Excel "From Web" / Power Query. Kept as a standalone endpoint (handy for direct access and
debugging); the primary integration is the embedded table on the page itself — see §6a.
Validates with `priceViewSchema`; responds `no-store`. `?full=1` appends the **enriched
export columns** (same 32‑column set as the Export button, via `lib/dataset.ts`); otherwise
it returns the 11‑column base board. `maxDuration = 300` covers the ~40s enrichment scrape.

---

## 6a. Excel "From Web" / Power Query integration

Excel's **From Web** connector cannot read a normal React page: the table is rendered
client‑side, so Excel sees an empty HTML shell (Navigator shows only "HTML Code" /
"Displayed Text", no table). The client must be able to paste the **same URL they browse**
(`/prices/<view>`) and get data.

**Why not content‑negotiation?** We tried detecting Excel vs browser in middleware (by
user‑agent, then by `Sec-Fetch-*` headers). It failed: Excel "From Web" sends the **same
navigation headers as a real browser**, so the two are indistinguishable at the same URL.
That approach (and the middleware) was removed.

**The solution — embed a real table in the page** (`app/prices/[view]/page.tsx`):

- The page renders the interactive `<PricesView>` **and** a hidden, server‑rendered
  `<table id="dse-data">` holding the **full enriched export dataset** (32 columns, via
  `lib/dataset.ts`).
- The table is visually hidden **off‑screen** (`position:absolute; left:-99999px`), *not*
  `display:none`, so every HTML‑table parser (incl. Excel) still enumerates it while users
  never see it.
- It is streamed via **`<Suspense>`** so the ~40s enrichment scrape does **not** block the
  interactive UI — the browser shows the React app immediately; the hidden table flushes
  into the HTML stream when ready. Power Query reads the full response body, so it receives
  the completed table.

Net effect at one URL: **browser → website UI; Excel → the 32‑column table.** No detection,
no user‑agent/header guessing, no `?format=excel` suffix.

**Client workflow:** Excel → Data → From Web → paste `https://<host>/prices/<view>` → load
table `dse-data` → thereafter just **Data → Refresh All**. All 10 views work (`latest,
change, value, volume, ltp, group, alpha, treasury, sme, atb`). Each refresh re‑scrapes
(~40s for the enriched set; ~5 min cache warmth after — see the prewarm route in §8).

**Cost of this approach:** every page load (browser included) triggers the enrichment
scrape. The UI stays interactive via streaming, and the 30s/5‑min caches + background
prewarm absorb most of the repeat cost, but cold loads do ~400 detail‑page fetches.
`/api/table/<view>` (optionally `?full=1`) remains available for direct, UI‑free access.

---

## 7. Client data flow (`hooks/` + `lib/api.ts`)

- `lib/api.ts` — `getJson(url, schema)` fetches a route and **validates the response with
  the matching Zod schema** before returning typed data. Fetchers: `fetchPrices`,
  `fetchIndustries`, `fetchIndustryTable`, `fetchCompany`, `fetchCompanyList`.
- `hooks/useDseData.ts` — React Query wrappers (`usePrices`, `useIndustries`,
  `useIndustryTable`, `useCompany`, `useCompanyList`) with sensible `staleTime`s.
- `components/providers.tsx` — the `QueryClientProvider` (30s default stale time, no
  refetch‑on‑focus, 1 retry), mounted once in `layout.tsx`.

**Why server shells + client views?** React Query is client‑side. Keeping pages as tiny
server components that only read params (and validate them) avoids `useSearchParams`
Suspense pitfalls, while the interactive views own fetching, skeletons, error cards, and
the Refresh button.

---

## 8. The export pipeline (`lib/export/` + `app/api/export`)

The single most important flow. `GET /api/export`:

1. **Validate** the query with `exportQuerySchema`.
2. **Company source** → dedicated section‑aware builders (`companyToCsv/Excel/Pdf`) —
   fast, one page.
3. **Prices / industry source**:
   - `resolveDataset(q)` scrapes the base board (headers + rows + codes), stripping
     footnote asterisks from headers (`LTP* → LTP`).
   - `enrichDataset(data)` scrapes **every listed company** via `getEnrichedRows`, then
     appends the extra columns per row, matched by trading code:
     `Total Outstanding Securities · 52‑Week Range · Free Float Cap · Shareholding 1/2/3
     (As‑On Date · Sponsor/Director · Govt · Institute · Foreign · Public)`
     → a 32‑column merged table (defined in `export/detailed.ts`).
   - The merged `{headers, rows}` is rendered by the requested builder:
     - **`csv.ts`** — RFC‑escaped, UTF‑8 BOM.
     - **`excel.ts`** — styled worksheet (frozen header, auto widths).
     - **`pdf.ts`** — `pdfmake` landscape; font size + column widths **scale down** for
       wide tables so all columns wrap onto the page.
4. Stream the bytes with `Content-Disposition: attachment`.

**Cost:** enriching the full ~396‑row board takes ~40s uncached (bounded to 10 concurrent
DSE fetches), then ~5 min of cache warmth. The UI `ExportButtons` show a live timer and
support **cancel** via `AbortController`. (PDF is disabled on the Share Prices page via
the `formats` prop; enabled for sectors and single companies.)

---

## 9. UI layer

- **Layout & theme** — `layout.tsx` is a flex column (`min-h-screen`) so the footer
  always sits at the bottom. Theme tokens are CSS variables in `globals.css`
  (emerald primary); `tailwind.config.js` maps them to `bg-primary` etc.
- **Navigation** — `MainNav` (desktop links, hidden `< sm`) and `MobileNav` (hamburger
  beside the logo). The mobile drawer slides in from the left and is **portaled to
  `document.body`** with `z-[100]` so it escapes the sticky header's stacking context
  (the fix for the drawer appearing behind page content). Nav links live in `lib/nav.ts`.
- **`DataTable`** — client component: search filter, click‑to‑sort (numeric aware),
  coloured change cells, trading‑code links to `/company/<code>`; horizontal scroll on
  narrow screens.
- **`CompanySearch`** — debounced (~220ms) typeahead over `/api/companies`; keyboard
  nav (↑/↓/Enter/Esc) + click select; shows a spinner while the code list loads.
- **`CompanyView`** — price **hero** (last price + coloured up/down change badge) plus
  section cards with icons.
- Everything is responsive (wrapping toolbars, full‑width mobile search, stacked headers).

---

## 10. Request lifecycles (worked examples)

**Viewing `/prices/change`:**
`page.tsx` validates `view` → renders `<PricesView view="change">` → `usePrices` hook →
`GET /api/prices/change` → `getPriceTable` → `fetchHtml` + `parseSharesTable` (cache 30s)
→ JSON → Zod‑validated on the client → `DataTable` renders.

**Exporting enriched Excel for a sector:**
Click **Excel** → `fetch('/api/export?source=industry&area=11&format=xlsx')` (timer
starts) → validate → scrape sector board → `getEnrichedRows` scrapes each company (pool
of 10, cached) → merge 32 columns → `exceljs` buffer → download. Cancel aborts the fetch.

---

## 11. Key decisions & tradeoffs

- **On‑demand scraping, no DB** — always fresh, simplest to run; the tradeoff is latency
  and load on DSE, mitigated by the in‑memory cache.
- **Header‑driven parsing** — one parser handles both the price and (wider) sector tables;
  new columns flow through to display and export automatically.
- **Enrichment merged into the normal export** (not a separate button) — per the product
  decision; the cost is a ~40s first export, surfaced via a timer + cancel.
- **Client‑safe `views.ts`** — the price‑view metadata is split out so client components
  and Zod schemas don't pull the Node‑only scraper (axios/cheerio) into the browser bundle.
- **Long‑lived host preferred** — the in‑memory cache and long exports favour a container
  host (Render, Koyeb, an Oracle Cloud free VM, Railway, …) over serverless
  (see README → Deployment).

---

## 12. Known limitations

- **No full company names in bulk** — DSE only exposes trading codes in list pages, so the
  lookup typeahead suggests **codes** (the full name shows on the detail page). A code→name
  index would require pre‑scraping all ~400 detail pages.
- **Cache is per‑process** — clears on redeploy and isn't shared across replicas. For
  durable caching, swap `cache.ts` for Redis / Vercel KV.
- **DSE may rate‑limit cloud IPs** — untestable until deployed.
- **`alpha` view** returns whatever DSE serves for that page (a subset), by design.

---

## 13. Extending the app

- **Add a price view** → add an entry to `PRICE_VIEWS` in `lib/views.ts` (the enum,
  routes, tabs, and export all derive from it).
- **Add an export column** → extend `enrichedHeaders()` / `enrichedCells()` in
  `export/detailed.ts` and the corresponding parse in `scraper/enriched.ts`.
- **Add a page** → create a server shell in `app/…/page.tsx` that renders a client view
  in `components/views/`, backed by a hook in `hooks/useDseData.ts` and a fetcher in
  `lib/api.ts` (+ a Zod schema in `schemas.ts`).
- **Durable cache** → replace the `Map` in `lib/cache.ts` with a Redis/KV client (keep the
  `cached(key, producer, ttl)` signature and everything else works unchanged).

---

## 14. Uptime scheduler (keep‑alive)

Free hosts (Render, Koyeb) **spin the service down after ~10–15 min of no traffic**, so the
next visitor pays a cold start and the in‑memory cache (§5) is lost. To keep the process
warm, an **external cron pinger** hits the app on a short interval.

- **Scheduler:** [cron-job.org](https://console.cron-job.org/) (free tier).
- **Interval:** every **10 minutes** (shorter than the host's idle timeout).
- **Endpoint:** `GET /api/health` — the `health/route.ts` liveness route that returns
  `{ status: "ok" }`. It's intentionally cheap: **it does not scrape DSE**, so the
  keep‑alive traffic costs nothing beyond waking the process.
- **Setup:** create a job in the cron-job.org console pointing at the deployed health URL
  (e.g. `https://<your-app>.onrender.com/api/health`), scheduled every 10 minutes.

Only relevant for the free **sleep‑when‑idle** tiers — an always‑on host (Oracle Cloud
"Always Free" VM, or a paid Railway service) never sleeps, so no external pinger is needed.
See README → Deployment for the host comparison.
