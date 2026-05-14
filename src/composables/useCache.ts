interface CacheEntry {
  data: any;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL = 30000;

export function useCache() {
  const get = (key: string): any | null => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  };

  const set = (key: string, data: any, ttlMs: number = DEFAULT_TTL) => {
    cache.set(key, { data, expiry: Date.now() + ttlMs });
  };

  const invalidate = (pattern?: string) => {
    if (!pattern) {
      cache.clear();
      return;
    }
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  };

  return { get, set, invalidate };
}
