// Shared IP rate limiter for API routes
// Uses Redis in production, in-memory Map for local dev
// 30 requests per hour per IP

import { redis } from "./redis";

const RATE_LIMIT = 30;
const RATE_WINDOW_S = 60 * 60; // 1 hour

// ── In-memory fallback (local dev) ──
const memMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimitedMem(ip: string): boolean {
  const now = Date.now();
  const entry = memMap.get(ip);

  if (!entry || now > entry.resetAt) {
    memMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_S * 1000 });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// ── Redis implementation ──
async function isRateLimitedRedis(ip: string): Promise<boolean> {
  const key = `rl:${ip}`;
  const count = await redis!.incr(key);
  // Set expiry only on the first increment
  if (count === 1) {
    await redis!.expire(key, RATE_WINDOW_S);
  }
  return count > RATE_LIMIT;
}

// ── Public API ──
export async function isRateLimited(ip: string): Promise<boolean> {
  if (redis) {
    try {
      return await isRateLimitedRedis(ip);
    } catch {
      // Redis failure — fall back to in-memory
      return isRateLimitedMem(ip);
    }
  }
  return isRateLimitedMem(ip);
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

// Clean up stale in-memory entries every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of memMap.entries()) {
      if (now > entry.resetAt) memMap.delete(ip);
    }
  }, 10 * 60 * 1000);
}
