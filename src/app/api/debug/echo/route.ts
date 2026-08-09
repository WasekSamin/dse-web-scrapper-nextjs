export const dynamic = "force-dynamic";

/** Escape a value for safe embedding in HTML. */
function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Diagnostic endpoint: returns every request header as a plain HTML <table>.
 * Load it in Excel "From Web" (or a browser) to see exactly what headers the
 * client sends — used to tune the browser-vs-Excel detection in middleware.ts.
 */
export async function GET(req: Request) {
  const rows = [...req.headers.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Request Headers</title></head>
<body>
<table id="dse-headers" border="1">
<thead><tr><th>Header</th><th>Value</th></tr></thead>
<tbody>${rows}</tbody>
</table>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
