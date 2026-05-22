// Server-side daily message limit tracker
// Uses Redis in production, in-memory Map for local dev
// Free users: 3 messages/day (by IP)
// Wallet holders: 10 messages/day (by wallet address)
// Resets at 00:00 UTC

import { redis } from "./redis";

const FREE_DAILY_LIMIT = 3;
const OWNER_DAILY_LIMIT = 10;

function getUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailyKey(ip: string, walletAddress?: string): string {
  const date = getUtcDate();
  return walletAddress
    ? `daily:wallet:${date}:${walletAddress.toLowerCase()}`
    : `daily:ip:${date}:${ip}`;
}

function getLimit(walletAddress?: string): number {
  return walletAddress ? OWNER_DAILY_LIMIT : FREE_DAILY_LIMIT;
}

// Seconds until next midnight UTC
function secondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  ));
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

// ── In-memory fallback (local dev) ──
interface MemEntry { count: number; resetDate: string }
const memMap = new Map<string, MemEntry>();

function getOrResetMem(key: string): MemEntry {
  const today = getUtcDate();
  const entry = memMap.get(key);
  if (!entry || entry.resetDate !== today) {
    const fresh = { count: 0, resetDate: today };
    memMap.set(key, fresh);
    return fresh;
  }
  return entry;
}

function checkMem(ip: string, walletAddress?: string) {
  const key = getDailyKey(ip, walletAddress);
  const limit = getLimit(walletAddress);
  const entry = getOrResetMem(key);
  const remaining = Math.max(0, limit - entry.count);
  return { allowed: entry.count < limit, remaining, limit };
}

function consumeMem(ip: string, walletAddress?: string) {
  const key = getDailyKey(ip, walletAddress);
  const entry = getOrResetMem(key);
  entry.count++;
}

// ── Redis implementation ──
async function checkRedis(ip: string, walletAddress?: string) {
  const key = getDailyKey(ip, walletAddress);
  const limit = getLimit(walletAddress);
  const count = (await redis!.get<number>(key)) ?? 0;
  const remaining = Math.max(0, limit - count);
  return { allowed: count < limit, remaining, limit };
}

async function consumeRedis(ip: string, walletAddress?: string) {
  const key = getDailyKey(ip, walletAddress);
  const count = await redis!.incr(key);
  // Set expiry on first increment so it auto-cleans after midnight
  if (count === 1) {
    await redis!.expire(key, secondsUntilMidnightUTC());
  }
}

// ── Public API ──
export async function checkDailyLimit(
  ip: string,
  walletAddress?: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  if (redis) {
    try {
      return await checkRedis(ip, walletAddress);
    } catch {
      return checkMem(ip, walletAddress);
    }
  }
  return checkMem(ip, walletAddress);
}

export async function consumeDailyMessage(
  ip: string,
  walletAddress?: string
): Promise<void> {
  if (redis) {
    try {
      await consumeRedis(ip, walletAddress);
      return;
    } catch {
      consumeMem(ip, walletAddress);
      return;
    }
  }
  consumeMem(ip, walletAddress);
}

// Clean up stale in-memory entries every hour
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const today = getUtcDate();
    for (const [key, entry] of memMap.entries()) {
      if (entry.resetDate !== today) memMap.delete(key);
    }
  }, 60 * 60 * 1000);
}
