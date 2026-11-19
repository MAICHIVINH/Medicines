import { RateLimitError } from './errors';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

export interface RateLimiterOptions {
  namespace: string;
  maxRequests: number;
  windowMs: number;
}

export function checkRateLimit(
  identifier: string,
  options: RateLimiterOptions
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let store = stores.get(options.namespace);
  if (!store) {
    store = new Map();
    stores.set(options.namespace, store);
  }

  // Cleanup expired entries periodically when map exceeds 500 keys
  if (store.size > 500) {
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }

  const existing = store.get(identifier);
  if (!existing || existing.resetAt <= now) {
    const entry: RateLimitEntry = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    store.set(identifier, entry);
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  existing.count += 1;
  if (existing.count > options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: options.maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

export function enforceRateLimit(identifier: string, options: RateLimiterOptions): void {
  const result = checkRateLimit(identifier, options);
  if (!result.allowed) {
    const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);
    throw new RateLimitError(
      `Bạn đã vượt quá giới hạn truy cập cho phép. Vui lòng thử lại sau ${retryAfterSec} giây.`
    );
  }
}

export function resetRateLimit(namespace: string, identifier?: string): void {
  const store = stores.get(namespace);
  if (!store) return;
  if (identifier) {
    store.delete(identifier);
  } else {
    store.clear();
  }
}

