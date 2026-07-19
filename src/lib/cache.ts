// Tiny in-memory TTL cache so repeated loads / an export click don't re-hit DSE
// for the same view within a few seconds. Not a database — just a Map that lives
// for the lifetime of the server process.

interface Entry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();

const DEFAULT_TTL_MS = 30_000;

/**
 * Return cached value for `key` if fresh, otherwise call `producer`, cache and
 * return it. Concurrent callers within the TTL share the same result.
 */
export async function cached<T>(
  key: string,
  producer: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) {
    return hit.value as T;
  }
  const value = await producer();
  store.set(key, { value, expires: now + ttlMs });
  return value;
}
