import axios, { AxiosInstance } from "axios";
import https from "node:https";

// dsebd.org presents an incomplete TLS chain and rejects requests without a
// browser-like User-Agent. We relax cert verification for THIS host only via a
// dedicated https agent, and always send a realistic UA.
//
// keepAlive reuses TLS connections across the hundreds of company-detail
// requests an enriched export makes, avoiding a fresh handshake each time
// (a big speedup). maxSockets caps concurrent sockets to stay polite to DSE.
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  keepAliveMsecs: 15_000,
  maxSockets: 32,
});

const client: AxiosInstance = axios.create({
  baseURL: "https://old.dsebd.org",
  timeout: 20_000,
  httpsAgent,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  },
  // We parse HTML ourselves.
  responseType: "text",
  transformResponse: [(data) => data],
});

/** Fetch a page path (e.g. "/latest_share_price_scroll_l.php") as HTML text. */
export async function fetchHtml(path: string): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await client.get<string>(path);
      return res.data;
    } catch (err) {
      lastErr = err;
      // brief backoff before retrying
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw new Error(
    `Failed to fetch ${path} after 3 attempts: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`
  );
}
