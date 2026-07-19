# DSE Web Scrapper

A [Next.js](https://nextjs.org/) app that scrapes **live** share‑price data from the
Dhaka Stock Exchange ([dsebd.org](https://www.dsebd.org)), presents it in a clean,
responsive UI, and lets you **export any table as CSV, Excel, or PDF** — including an
enriched export that mirrors DSE's own detailed file.

Data is scraped **on demand** (no database) with a short in‑memory cache, so every view
is fresh from DSE.

> For personal / educational use. Built by
> [Wasek Samin](https://github.com/WasekSamin).

---

## Features

- **Share Prices** — all 8 DSE price views (By Trade Code, By Change, By Value,
  By Volume, By LTP, By Group, Alphabetical, Treasury Bond) as sortable, searchable
  tables with coloured +/- change cells.
- **By Sector** — pick any DSE business area / sector (Bank, Pharma, Fuel & Power, …)
  and see its securities (includes the extra `LTY` / `OAP` columns).
- **Company Lookup** — a debounced **typeahead** over all trading codes; select one (or
  click any code in a table) to open its detail page — market data, capital, dividends
  and shareholding, grouped into cards with a price hero.
- **Exports**
  - **CSV & Excel** are *enriched*: the price columns **plus** per‑company data scraped
    from each detail page — Outstanding Securities, 52‑Week Range, Free Float Market Cap,
    and Share Holding % (Sponsor/Director, Govt, Institute, Foreign, Public) across 3
    periods — matching DSE's own export layout.
  - **PDF** carries the same columns in a scaled landscape layout (except on the Share
    Prices page, where PDF is disabled).
  - Every export shows a running timer and can be **cancelled** mid‑run.
- **Responsive** — desktop nav collapses to a left slide‑in **sidebar drawer** on mobile.

---

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Data fetching | TanStack **React Query** |
| Validation | **Zod** (route inputs + response parsing) |
| Scraping | **axios** + **cheerio** |
| Exports | hand‑built CSV, **exceljs** (Excel), **pdfmake** (PDF) |

---

## Getting started

Requires **Node ≥ 20**.

```bash
npm install
npm run dev        # http://localhost:3005
```

Production:

```bash
npm run build
npm start          # serves on $PORT (or 3005 locally), bound to 0.0.0.0
```

Other scripts:

```bash
npm run lint       # eslint
npx tsc --noEmit   # type-check
```

> **Tip:** if you switch between `npm run build` and `npm run dev` and hit a
> `Cannot find module './vendor-chunks/…'` error, delete the stale build cache:
> `rm -rf .next` and restart.

---

## API reference

All routes are dynamic (scraped at request time).

| Route | Purpose |
|---|---|
| `GET /api/prices/[view]` | A price board. `view` ∈ `latest, change, value, volume, ltp, group, alpha, treasury` |
| `GET /api/industry` | List of sectors |
| `GET /api/industry?area=<id>` | One sector's price table |
| `GET /api/company/[code]` | Company detail, e.g. `/api/company/GP` |
| `GET /api/companies` | All trading codes (for the lookup typeahead) |
| `GET /api/export?source=…&format=csv\|xlsx\|pdf` | Enriched export file download |
| `GET /api/health` | Liveness check → `{"status":"ok"}` |

Export query params: `source=prices&view=<view>`, `source=industry&area=<id>`, or
`source=company&code=<code>`, plus `format`.

---

## Deployment

**Railway (recommended)** — this app runs best on a long‑lived container host, because
the enriched exports scrape ~400 pages (~40s) and the in‑memory cache benefits from a
persistent process.

1. Push to GitHub → Railway **New Project → Deploy from GitHub repo**.
2. Railway auto‑detects Next.js (Nixpacks): `npm install` → `npm run build` → `npm start`.
3. `railway.json` pins the build/start commands, `/api/health` check, and restart policy.
   The `start` script uses Railway's injected `$PORT` and binds `0.0.0.0`.

**Vercel** works for the *fast* endpoints, but the enriched CSV/Excel/PDF exports can hit
the serverless execution‑time limit (fine on Pro's 300s; risky on Hobby's 60s cap), and
the in‑memory cache does not persist across serverless instances.

> **Note:** dsebd.org uses cloud‑hostile settings; the scraper sends a browser
> `User-Agent` and relaxes TLS verification for that host. A cloud provider's IPs
> *may* still be rate‑limited by DSE — only testable once deployed.

---

## Documentation

See [`DOCS.md`](./DOCS.md) for a full walkthrough of the architecture, data flow,
scraping/parsing details, the enrichment pipeline, and how each module fits together.
