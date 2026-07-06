/**
 * LLM response cache — in-memory cache with TTL support.
 *
 * In production this would be replaced with a Redis-backed cache.
 */

interface CacheEntry {
  response: string;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export function getCached(key: string): string | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.response;
}

export function setCache(key: string, response: string, ttlMs: number): void {
  store.set(key, { response, expiresAt: Date.now() + ttlMs });
}

export function invalidate(pattern?: string): void {
  if (!pattern) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.includes(pattern)) store.delete(key);
  }
}

export function cacheKey(prompt: string, model: string): string {
  const hash = simpleHash(`${model}:${prompt}`);
  return `llm:${hash}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function cacheSize(): number {
  return store.size;
}