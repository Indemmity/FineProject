/**
 * Rate limiter — in-memory token bucket for API endpoints.
 *
 * Applied as middleware to all /api/* routes.
 * Per-user and per-IP buckets with graduated limits.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const ipBuckets = new Map<string, Bucket>();
const userBuckets = new Map<string, Bucket>();

const IP_RATE = { capacity: 60, refillPerSec: 1 };     // 60 req/min per IP
const USER_RATE = { capacity: 120, refillPerSec: 2 };   // 120 req/min per user

function getBucket(
  store: Map<string, Bucket>,
  key: string,
  capacity: number,
  refillPerSec: number,
): Bucket {
  let bucket = store.get(key);
  const now = Date.now();
  if (!bucket) {
    bucket = { tokens: capacity, lastRefill: now };
    store.set(key, bucket);
  }
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerSec);
  bucket.lastRefill = now;
  return bucket;
}

export function rateLimit(
  request: NextRequest,
  userId?: string,
): { allowed: boolean; remaining: number; retryAfter: number } {
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";

  const ipBucket = getBucket(ipBuckets, ip, IP_RATE.capacity, IP_RATE.refillPerSec);
  if (ipBucket.tokens < 1) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil(1 / IP_RATE.refillPerSec) };
  }

  if (userId) {
    const uBucket = getBucket(userBuckets, userId, USER_RATE.capacity, USER_RATE.refillPerSec);
    if (uBucket.tokens < 1) {
      return { allowed: false, remaining: 0, retryAfter: Math.ceil(1 / USER_RATE.refillPerSec) };
    }
    uBucket.tokens -= 1;
  }

  ipBucket.tokens -= 1;
  return { allowed: true, remaining: Math.floor(ipBucket.tokens), retryAfter: 0 };
}

export function rateLimitMiddleware(
  request: NextRequest,
  userId?: string,
): NextResponse | null {
  const result = rateLimit(request, userId);
  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down.", retryAfter: result.retryAfter },
      { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
    );
  }
  return null;
}