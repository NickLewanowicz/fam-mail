# ADR 0003: The OIDC Callback Delivers a One-Time Ticket, Not Tokens

- Status: Accepted — gates the fix for GitHub #86 (ISSUE-0086, security)
- Date: 2026-11-03
- Deciders: Maintainer, Priya (principal engineer)
- supersedes: none; replaces the redirect contract documented in `docs/API.md` "OAuth 2.0 Authorization Code"

## Context

Trace of the current flow, end to end, at main 1e89725:

1. `POST /api/auth/login` (`server.ts:288-298`) → `handleAuthLogin` (`auth.ts:74-83`): mints `state`, stores `{ state → codeVerifier }` in the in-memory TTL `oidcStateStore` (`auth.ts:15-24`; 10-minute TTL, lazy + timer eviction, test hooks at `:65-72`), returns the IdP `authUrl`.
2. User authenticates at the IdP; IdP redirects to `GET /api/auth/callback?code=…&state=…` (`server.ts:300-307`: dev-mode 400 at `:301-303`, then `authRateLimiter` — 10/min/IP, `server.ts:24` via `checkRateLimit`, `server.ts:63-70`).
3. `handleAuthCallback` (`auth.ts:85-131`): exchanges code + verifier for the user (`:101`), mints access + refresh JWTs (`:104-105`), **persists the session row** (`:107-112`, 7-day expiry), consumes the state (`:115`), then builds and returns:

   ```
   redirectUrl = `${origin}/auth/callback?token=${accessToken}&refreshToken=${encodeURIComponent(refreshToken)}`
   return applyHeaders(Response.redirect(redirectUrl), req)   // 302
   ```
   (`auth.ts:117-118`. Note `accessToken` is interpolated **unencoded** — safe today only because JWT base64url is URL-safe; correct by accident.)
4. The browser then issues `GET /auth/callback?token=…&refreshToken=…` against the frontend origin. `AuthCallbackPage.tsx` reads both params from the **query string** (`:14-16`), calls `handleCallbackToken` (`:27`), then scrubs the address bar with `history.replaceState` (`:29`). `AuthProvider.handleCallbackToken` (`AuthProvider.tsx:96-110`) writes both tokens to **localStorage** (`fam_mail_token` / `fam_mail_refresh_token`, `authApi.ts:8-9`) and loads `/api/auth/me`.

Where the tokens actually leak (confirms ISSUE-0086; one correction):

- **Server / proxy logs — the primary exposure.** The 302 causes a real frontend-origin `GET` whose URL contains both live credentials. Every hop that logs request URLs — the static host, nginx/CDN/LB access logs, TLS-terminating proxies, corporate egress proxies — captures tokens that stay valid for their full session TTL (7 days, `auth.ts:109`). The backend's own `Location` response header is rarely logged; the *subsequent frontend request* always is.
- **Referer.** Any subresource the callback document fetches before `replaceState` runs carries the full URL as `Referer`. `Referrer-Policy: strict-origin-when-cross-origin` (`headers.ts:32`) caps *cross-origin* referers — but only on responses the backend serves: dev mode serves the frontend from Vite (headers absent), split-host deployments may not apply the policy, and same-origin subresources still receive the full query. The fix must not depend on header policy at the leaking URL's own origin.
- **History / session restore — partially mitigated, not solved.** `replaceState` (`AuthCallbackPage.tsx:29`) rewrites the history entry, so the happy path does not persist the URL — ISSUE-0086's history claim is true only for the window before JS runs (crash, tab close, "reopen closed tab" session restore, back/forward before cleanup). That window is real but is the *smallest* of the exposures.
- **Shared-link risk.** A URL copied during the callback window (address bar, or from history where cleanup never ran) is a working credential.
- Not a leak but the same family: `?error=` redirects (`AuthCallbackPage.tsx:21-23`) carry no secrets and stay.

Bounding facts:

- The frontend is a SPA holding Bearer tokens in localStorage; every authenticated call sends `Authorization: Bearer` (`authApi.ts:91-101`). There is no cookie-session concept anywhere in the API.
- Dev mode already has a parallel, safe path: `POST /api/auth/dev-login` returns the token pair in a **JSON POST body** (`devLoginResponse`, `server.ts:181-208`, dispatched `:283-285`; `initiateLogin` branches on `devMode`, `authApi.ts:57-58`). Nothing in dev login touches a URL.
- The Agent API is static API key only: "JWTs from the web UI are not accepted on `/api/v1`" (`docs/agent-api.md:29`). Unaffected by anything decided here.
- Production deploys are single-artifact: Bun serves `frontend/dist` (`server.ts:163` + the static dispatch at the bottom of `routeRequest`), so backend and frontend ship together.

## Decision

**Option (a): one-time, short-TTL authorization ticket. The redirect carries a worthless nonce; the frontend exchanges it for tokens in a JSON POST body. Nothing long-lived ever appears in a URL.**

1. `handleAuthCallback` keeps minting tokens and inserting the session exactly as today (`auth.ts:104-112` — the sessions table remains the system of record; **no schema change**). It then stores `ticket → { accessToken, refreshToken, expiresAt }` in a new in-memory TTL store (60-second TTL), a direct clone of the `oidcStateStore` machinery (same file: Map, lazy eviction on access, `unref`-ed cleanup timer, `_clearTicketStore()`/`_ticketStoreSize()` test hooks beside `:65-72`). The redirect becomes `${origin}/auth/callback?ticket=${crypto.randomUUID()}` — same entropy as the existing `state` param (`auth.ts:75`).
2. New endpoint `POST /api/auth/callback/exchange`, body `{ ticket }`:
   - Consumes the ticket atomically (lookup + delete before any other work — one-time use);
   - 400 on missing/malformed/non-string ticket; 401 on unknown, expired, already-consumed, or session-row-gone (logout or cleanup during the 60s window) — machine-readable `error` per the global handler contract;
   - Success returns `{ accessToken, refreshToken }` — byte-identical shape to `handleAuthRefresh` (`auth.ts:203-206`) — plus `Cache-Control: no-store` (it is a token-bearing response; new endpoints get the new bar).
   - Dispatched in `server.ts` beside the callback route (`:300-307`), rate-limited by `authRateLimiter` via the existing `checkRateLimit` helper, wrapped in `withSecurityHeaders` via `jsonResponse` (security + CORS headers, `headers.ts:94-115`). Guessing a UUIDv4 ticket is computationally infeasible; the limiter is defense-in-depth consistent with every other auth endpoint.
   - CSRF: not a vector — the endpoint requires an unguessable ticket and no ambient credentials (no cookies involved anywhere).
   - Dev mode: no special-casing. Tickets are created only by the OIDC callback, which dev mode 400s; an exchange without a ticket simply 401s.
3. `AuthCallbackPage` reads `ticket`, POSTs the exchange, and on success calls the **unchanged** `handleCallbackToken(data.accessToken, data.refreshToken)` (`AuthProvider.tsx:96-110` — storage untouched). On failure → the existing error shape (`/login?error=…`, `AuthCallbackPage.tsx:21-23, 36-38`). The `?error=` redirect channel stays.

**Why the other candidates fail the bar:**

- **(b) httpOnly SameSite cookie handoff — REJECTED.** An httpOnly cookie cannot be read by the SPA, so it would have to *be* the credential: that converts the entire API from Bearer-in-localStorage to cookie sessions — AuthMiddleware, every route, every frontend `fetch`, and the Agent API's explicit JWT-non-acceptance story (`docs/agent-api.md:29`) all change. A non-httpOnly handoff cookie adds CSRF surface and cross-origin cookie juggling (dev runs frontend :5173 against backend :8484; `Access-Control-Allow-Credentials: true` already exists, `headers.ts:55`) while the tokens still end up in the same localStorage — strictly more mechanism, zero added safety over (a).
- **(c) URL fragment instead of query + immediate strip — REJECTED.** Fragments do dodge server access logs and are never sent as Referer — the two claims in its favor are true. But they persist in history/session restore exactly like query strings, the scrub still depends on JS running, and — decisive — the pattern keeps a credential parseable out of a URL forever, the shape OAuth 2.0's browser-based-apps BCP retired along with the implicit flow. (a) costs one store and one endpoint and deletes the credential-in-URL pattern outright. "Log-safe tokens" is a partial fix sold as a whole one.

## Backward compatibility

- **Callback route shape changes:** `/auth/callback?token=…&refreshToken=…` → `/auth/callback?ticket=…`. Old params are simply no longer read; a stale pre-upgrade token-URL yields "No authentication token received" → a normal login retry. No data migration; the sessions DDL is untouched (a ticket is a handshake nonce, like the PKCE state — deliberately memory-only; a server restart inside the 60s window costs at most one re-login).
- **In-flight sessions during deploy:** production ships backend + frontend as one artifact (Bun serves `frontend/dist`), so there is no mixed-version window in the deployed default. For split-host deployments: frontend-new/backend-old → exchange 404s; backend-new/frontend-old → old page sees no `token` param. Either order fails **one** login attempt with a retryable error — never a corrupted session, never an exposed token. Deploy both together; they are built together.
- **Dev mode:** `/api/auth/dev-login` and the dev refresh path (`devRefreshResponse`, `server.ts:210-277`) are untouched — they already POST bodies. The dev-mode callback 400 (`server.ts:301-303`) stays.
- **Agent API:** unaffected; `docs/agent-api.md` gets a one-line note after `:29` that the web auth flow changed with no `/api/v1` impact (drafts remain JWT-only and off `/api/v1` per ADR 0002).

## Consequences

**Positive:** credentials leave the URL class entirely — access logs, proxies, referer headers, history, and session restore now capture at most a dead-in-60-seconds, single-use UUID. Logout semantics hold (exchange verifies the session row still exists). The dev-login POST-body pattern and the exchange endpoint are now the same shape, which makes the security property legible: *tokens move in POST bodies, full stop*.

**Negative / costs:** one new in-memory store + endpoint (~60 LOC, cloned machinery, no new dependency); a new failure point in the login happy path (the exchange call), mitigated by the retryable-error UX that already exists. The in-memory store is single-instance, like `oidcStateStore` and the rate limiters today — a future multi-instance deployment must move ticket state (and those) to shared storage; this ADR does not pretend otherwise.

**Out of scope, named:** tokens still rest in localStorage (`authApi.ts:8-9`), which is XSS-readable by design tradeoff. This ADR fixes transport, not storage. Moving to cookie sessions is a different architecture with its own ADR if ever taken.

## Implementation note (gate for Sam — trace-verified at 1e89725)

Branch note: citations are main @ 1e89725, the integration target. The unmerged `feat/editor-shell` branch (d17eccd) touches `server.ts` only in error-handler/cleanup-ordering (no auth-route deltas) and `LoginPage.tsx` (post-login redirects — orthogonal); `auth.ts`, `AuthCallbackPage.tsx`, `authApi.ts`, `AuthProvider.tsx` are byte-identical on both lineages. Reconcile `server.ts` line numbers at merge; everything else applies clean.

**Backend — `backend/src/routes/auth.ts`:**

1. Add `ticketStore` (Map + TTL + lazy/timer eviction) cloned from `:15-72`, with `_clearTicketStore()` / `_ticketStoreSize()` test hooks beside `_clearStateStore`/`_stateStoreSize` (`:65-72`). TTL: 60 000 ms.
2. `handleAuthCallback`: replace `:117-118` with ticket creation (`crypto.randomUUID()`) + redirect to `${origin}/auth/callback?ticket=${ticket}`. Token minting and `db.insertSession` (`:104-112`) unchanged.
3. Add `handleTokenExchange(req)`: parse JSON body (`400` on invalid JSON), validate `ticket` is a non-empty string (`400`), atomic consume (`401` unknown/expired/consumed), verify the session row still exists via `db.getSessionByToken(accessToken)` (`401` if gone), respond `{ accessToken, refreshToken }` with `Cache-Control: no-store`. Export it from the `setupAuthRoutes` return (`:212-217`).

**Backend — `backend/src/server.ts`:**

4. Dispatch `POST /api/auth/callback/exchange` beside the callback route (`:300-307`): `checkRateLimit(authRateLimiter, req)` (helper `:63-70`; new limiter instance if a tighter budget is wanted — default to the existing `authRateLimiter`) → `handleTokenExchange` → `withSecurityHeaders`. Handle `authRoutes == null` (dev mode) with a 400 consistent with the callback route's dev-mode guard.

**Frontend:**

5. `frontend/src/services/authApi.ts`: add `exchangeTicket(ticket: string): Promise<{ accessToken: string; refreshToken: string }>` beside `initiateLogin` — plain `fetch` (pre-auth, same as `initiateLogin`), `AuthApiError` on non-OK.
6. `frontend/src/components/auth/AuthCallbackPage.tsx`: read `ticket` instead of `token`/`refreshToken` (`:14-16`); on presence POST the exchange, then `handleCallbackToken(data.accessToken, data.refreshToken)`; keep `hasProcessed` re-entry guard (`:12`, `:26`) and the loading/error markup (`:40-52`); keep a `replaceState` scrub for URL tidiness (no longer load-bearing). Legacy `?token=` is ignored.

**Docs (same PR):**

7. `docs/API.md`: rewrite the OAuth section — `:48-56` documents the leaky redirect verbatim today; replace with: callback redirects with `?ticket=…`, then `POST /api/auth/callback/exchange` returns the token pair (document 400/401/429). Dev-login sections (`:86-118`, `:143-149`) unchanged.
8. `docs/agent-api.md`: one line after `:29` noting the web callback change and zero `/api/v1` impact.

**Required tests:**

Backend, `backend/src/routes/auth.test.ts` (harness exists: the callback suite at `:165-322`; `:221` asserts the redirect today and must be updated):

1. Exchange success → 200 `{ accessToken, refreshToken }` equal to the pair persisted in the session row; ticket consumed (`_ticketStoreSize()` drops to 0).
2. Replay: second exchange with the same ticket → 401.
3. Expired ticket → 401 (force-evict via TTL, mirroring the expired-state test at `:293`).
4. Malformed: no body, `{}`, `{ ticket: 42 }`, `{ ticket: '' }` → 400.
5. **Callback redirect contains no tokens:** assert `Location`'s query has `ticket` only — no `token=` / `refreshToken=` substrings anywhere in the redirect target — and that the ticket value resolves exactly once via exchange.
6. Exchange after the session row is deleted → 401.
7. Rate limit: 11th exchange in the window from one IP → 429 (mirror the existing limiter tests in `security.test.ts`).
8. Dev mode unchanged: callback 400 (`server.ts` path) and dev-login POST body (existing tests keep passing).

Frontend, `frontend/src/components/auth/AuthCallbackPage.test.tsx` (the `?token=` tests at `:46-58` are rewritten):

9. `?ticket=…` → exchange POST called with the ticket → `handleCallbackToken` called with the returned pair; no double invocation (existing guard test, `:72`).
10. Exchange 401/network failure → navigates to `/login?error=…` (existing error test shape, `:61-67`).
11. Legacy `?token=test-token` → no storage write, error path (pins the breaking change deliberately).

All tests under `POSTGRID_MOCK=true` / OIDC stubs per agent/CI policy; no live calls.

## References

- ISSUE-0086 / GitHub #86 — the report; its "store tokens server-side with a short-lived code" option is this decision
- `auth.ts:15-72` — the `oidcStateStore` pattern cloned here; `:117-118` — the leak being removed
- `docs/API.md:48-56` — currently documents the leaky redirect; rewritten in this change
- OAuth 2.0 Browser-Based Apps BCP (IETF oauth-browser-based-apps) — implicit/fragment flows deprecated; authorization code + one-time front-channel nonce is the endorsed shape
- `headers.ts:18-32` — CSP and Referrer-Policy: why header policy alone is not the fix
- ADR 0002 — house implementation-note format (trace-verified, required tests enumerated)
