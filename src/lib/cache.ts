// Tiny in-memory TTL cache so repeated loads / an export click don't re-hit DSE
// for the same view within a few seconds. Not a database — just a Map that lives
// for the lifetime of the server process.

interface Entry<T> {
  // Stored as an in-flight promise (not a resolved value) so concurrent callers
  // for the same key coalesce onto ONE producer run. This is what makes a
  // background prewarm and a user's export click share the same scrape instead
  // of both hitting DSE — see /api/export/prewarm.
  value: Promise<T>;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();

const DEFAULT_TTL_MS = 30_000;

/**
 * Return cached value for `key` if fresh, otherwise call `producer`, cache and
 * return it. Concurrent callers within the TTL share the same in-flight result
 * (single-flight), so N simultaneous callers trigger at most one `producer`
 * run. A rejected producer is evicted so failures are never cached.
 */
export function cached<T>(
  key: string,
  producer: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) {
    return hit.value as Promise<T>;
  }
  // Store the promise immediately so a concurrent caller reuses this same run.
  const value = producer();
  store.set(key, { value, expires: now + ttlMs });
  // Don't cache a failure: if the producer rejects, drop the entry so the next
  // caller retries. Guard against evicting a newer entry for the same key.
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key);
  });
  return value;
}
