# Code Review Audit

Date: 2026-05-22

Scope: uncommitted changes in `normie-intelligence`, including staged, unstaged, and untracked files.

## Findings

### [P1] Session secret has a forgeable production fallback

File: `src/lib/wallet-auth.ts:7`

`SESSION_SECRET` falls back to the public string `"normie-intelligence-dev-secret-change-in-prod"`. If the environment variable is missing in production, anyone can compute the same HMAC for any holder wallet address and forge a valid `normie-session` cookie.

Impact: an attacker can receive the 10-message holder tier without owning or signing with a holder wallet.

Possible solutions:

- Fail fast when `SESSION_SECRET` is missing outside development.
- Require a sufficiently long random secret, for example 32+ bytes from a production secret manager.
- Keep the development fallback only behind an explicit `NODE_ENV === "development"` branch.

### [P2] Session tokens do not carry server-validated expiry

File: `src/lib/wallet-auth.ts:31`

The cookie is configured with `maxAge`, but the signed token itself is only `address.signature`. If a token is copied, restored, or sent manually after the browser cookie would have expired, the server has no `exp` claim to reject it.

Impact: copied session tokens remain valid until `SESSION_SECRET` rotates.

Possible solutions:

- Sign a structured payload containing `address`, `iat`, and `exp`.
- Reject expired tokens in `verifySessionToken`.
- Consider adding a logout/disconnect route that clears `normie-session`.
- Use a timing-safe comparison for signatures while touching this code.

### [P2] Daily and hourly limits are process-local

Files:

- `src/lib/daily-limit.ts:14`
- `src/lib/rate-limit.ts:3`

Both limiters use module-level `Map` instances. That works during one local process lifetime, but production deploys, restarts, and serverless/multi-instance routing will reset or split quota state.

Impact: users can exceed intended message limits when traffic lands on different instances or after a deployment/restart.

Possible solutions:

- Move counters to a shared durable store such as Redis, Vercel KV, Upstash, or a database table with TTL/reset fields.
- Use atomic increment operations with expiry for the hourly rate limiter.
- Store daily counters under keys such as `daily:ip:<date>:<ip>` and `daily:wallet:<date>:<verifiedWallet>`, expiring them after the UTC reset window.
- Keep in-memory maps only as a local-development fallback if no shared store is configured.

### [P2] Nonce creation is unauthenticated and unbounded

File: `src/app/api/auth/nonce/route.ts:4`

Every `GET /api/auth/nonce` creates a 5-minute in-memory nonce entry, and the route does not apply any rate limiting.

Impact: a burst of nonce requests can grow server memory quickly, especially because the nonce store is process-local and has no hard cap.

Possible solutions:

- Apply the shared IP rate limiter to `/api/auth/nonce`.
- Add a hard cap or bounded eviction policy to the nonce store.
- Prefer a shared store with TTL for nonces in production.
- Optionally bind nonces to IP/session metadata and validate that metadata in `/api/auth/verify`.

## Resolved Since Previous Audit

- `/api/chat` no longer trusts `walletAddress` from the request body. Holder tier is now derived from a verified `normie-session` cookie.
- `useWalletAuth()` is mounted on the Normie detail page and signs a server nonce through `viem`/`verifyMessage`.
- The lint-blocking `react-hooks/set-state-in-effect` errors were addressed; `npm.cmd run lint` now exits successfully with warnings only.
- Opening generation is token-specific via `openingGeneratedFor`, so navigating between Normies can generate a fresh opening for each token.
- `NormieGrid` invalidates stale holder-token loads with `activeRequest.current` in cleanup and in the no-address branch.
- The API routes fetch traits/canvas state server-side instead of trusting client-supplied traits.
- `/api/personality` uses the shared rate limiter.
- `ChatWindow` checks `res.ok` and displays error messages for failed API responses.
- The CSS uses `var(--font-space-grotesk)` and `var(--font-newsreader)` for the loaded `next/font` families.

## Non-Blocking Cleanup

- `src/app/layout.tsx:32` triggers `@next/next/no-page-custom-font` for the Material Symbols stylesheet.
- `src/app/normie/[id]/page.tsx:78` and `src/components/NormieGrid.tsx:63` trigger ref-cleanup dependency warnings.
- `src/components/ChatWindow.tsx:15` triggers a hook dependency warning because `messages = chats[tokenId] || []` can create a new array on each render.
- `<img>` usage in `src/app/page.tsx` and `src/components/PixelAvatar.tsx` triggers Next image optimization warnings.
- `CODE_REVIEW_AUDIT.md` is untracked and should be intentionally included or ignored before commit.

## Verification

- `npm.cmd run lint` passed with 6 warnings.
- `npm.cmd exec tsc -- --noEmit` passed.
- `npm.cmd run build` failed due to a local Turbopack workspace-root/environment issue: Next inferred `C:\Users\HP` as the workspace root because of another `package-lock.json`, then hit an access-denied error reading that directory. I did not treat this as a code-change finding.
