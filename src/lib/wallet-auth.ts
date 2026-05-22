// Server-side nonce store and session management for wallet auth
// Nonces are single-use, expire after 5 minutes, capped at 1000 entries
// Session tokens carry expiry and use timing-safe comparison

import { randomBytes, createHmac, timingSafeEqual } from "crypto";

// Fail fast in production if no secret is configured
const SESSION_SECRET = (() => {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }
  return "normie-intelligence-dev-secret-do-not-use-in-prod";
})();

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const NONCE_MAX_SIZE = 1000; // hard cap on stored nonces
const SESSION_TTL_S = 7 * 24 * 60 * 60; // 7 days in seconds

// In-memory nonce store (single-use, short-lived, bounded)
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

export function createNonce(): string | null {
  // Enforce hard cap — reject if store is full
  if (nonceStore.size >= NONCE_MAX_SIZE) {
    // Try to evict expired entries first
    evictExpiredNonces();
    if (nonceStore.size >= NONCE_MAX_SIZE) return null;
  }

  const nonce = randomBytes(32).toString("hex");
  const key = nonce.slice(0, 16);
  nonceStore.set(key, { nonce, expiresAt: Date.now() + NONCE_TTL_MS });
  return nonce;
}

export function consumeNonce(nonce: string): boolean {
  const key = nonce.slice(0, 16);
  const entry = nonceStore.get(key);
  if (!entry || entry.nonce !== nonce || Date.now() > entry.expiresAt) {
    return false;
  }
  nonceStore.delete(key);
  return true;
}

// Session token: address.issuedAt.hmac — carries expiry server-side
export function createSessionToken(walletAddress: string): string {
  const addr = walletAddress.toLowerCase();
  const iat = Math.floor(Date.now() / 1000);
  const payload = `${addr}.${iat}`;
  const sig = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): string | null {
  // Token format: address.iat.signature
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [addr, iatStr, sig] = parts;
  const iat = parseInt(iatStr, 10);
  if (isNaN(iat)) return null;

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (now - iat > SESSION_TTL_S) return null;

  // Timing-safe signature comparison
  const payload = `${addr}.${iatStr}`;
  const expected = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");

  try {
    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  return addr;
}

function evictExpiredNonces() {
  const now = Date.now();
  for (const [key, entry] of nonceStore.entries()) {
    if (now > entry.expiresAt) nonceStore.delete(key);
  }
}

// Cleanup expired nonces every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(evictExpiredNonces, 5 * 60 * 1000);
}
