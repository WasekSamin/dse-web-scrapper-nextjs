# DSE Web Scrapper

A [Next.js](https://nextjs.org/) app that scrapes **live** share‑price data from the
Dhaka Stock Exchange ([old.dsebd.org](https://old.dsebd.org)), presents it in a clean,
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
- **Excel "From Web" (live refresh)** — paste the **normal** price URL (e.g.
  `/prices/latest`) into Excel's **Data → From Web**. The page embeds a hidden,
  server‑rendered `<table>` with the **full enriched export columns**, so Excel finds it at
  the *same URL you browse* and **Refresh** re‑pulls live data — while browsers still see
  the full website UI. No suffix, no user‑agent tricks. See DOCS §6a.
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
npm test           # parser unit tests (Node's built-in runner; Node 22.18+)
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
| `GET /api/prices/[view]` | A price board. `view` ∈ `latest, change, value, volume, ltp, group, alpha, treasury, sme, atb` |
| `GET /api/table/[view]` | Same board as a plain HTML `<table>` for direct/UI-free access (`?full=1` for enriched). The page at `/prices/[view]` also embeds this table for Excel "From Web" |
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

This app runs best on a **long‑lived container host** (not serverless), because the
enriched exports scrape ~400 pages (~40s) and the in‑memory cache only helps on a
persistent process. The `start` script already honours each platform's `$PORT` and binds
`0.0.0.0`, so no code changes are needed for the container options below.

**Free options** (limits change — verify current terms):

| Host | Free? | Notes |
|---|---|---|
| **Render** (free web service) | ✅ no card | Easiest: deploy from GitHub. Spins down after ~15 min idle → cold start on next hit; cache clears on sleep. |
| **Koyeb** (free tier) | ✅ no card | 1 free container service; sleeps when idle. |
| **Oracle Cloud "Always Free" VM** | ✅ forever | Best for uptime: no cold starts, cache persists, no timeouts — but it's a VPS you set up (pm2/systemd + nginx). |
| **Google Cloud Run** | ✅ generous tier | Container, up to 60‑min request timeout; needs a Dockerfile + billing account; scales to zero. |

**Paid / trial:** **Railway** (one‑time trial credit, then ~$5/mo Hobby) is a great fit —
auto‑detects Next.js via Nixpacks and uses the included `railway.json` (build/start
commands, `/api/health` check, restart policy).

**Vercel (Hobby)** works for the *fast* endpoints, but the enriched CSV/Excel/PDF exports
can hit the serverless execution‑time limit (fine on Pro's 300s; risky on Hobby's 60s
cap), and the in‑memory cache does not persist across serverless instances.

**Typical container deploy (Render/Koyeb):** connect the GitHub repo → build `npm run
build`, start `npm start`, health check `/api/health`. Done.

### Keeping the app awake (uptime scheduler)

Free hosts like **Render** and **Koyeb** spin the service down after ~10–15 min of no
traffic, which means a slow cold start on the next visit (and the in‑memory cache is lost).
To avoid this, an external cron/uptime pinger hits the app on an interval so it never goes
idle.

- **Scheduler in use:** [cron-job.org](https://console.cron-job.org/) (free tier).
- **What it does:** sends an HTTP request every **10 minutes** to keep the host awake.
- **Endpoint to ping:** `GET /api/health` — the lightweight liveness route
  (`{"status":"ok"}`); it doesn't scrape DSE, so the keep‑alive stays cheap.
- **Setup:** in the cron-job.org console, create a job with the deployed URL
  (e.g. `https://<your-app>.onrender.com/api/health`), schedule = every 10 minutes.

> Not needed on an always‑on host (Oracle Cloud "Always Free" VM, or a paid Railway
> service) — those never sleep, so the scheduler is only relevant for the free
> sleep‑when‑idle tiers.

> **Note:** dsebd.org uses cloud‑hostile settings; the scraper sends a browser
> `User-Agent` and relaxes TLS verification for that host. A cloud provider's IPs
> *may* still be rate‑limited by DSE — only testable once deployed.

---

## Documentation

See [`DOCS.md`](./DOCS.md) for a full walkthrough of the architecture, data flow,
scraping/parsing details, the enrichment pipeline, and how each module fits together.
