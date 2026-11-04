# Test Hermeticity Plan — 2026-11-03 (QA / Marcus)

Issue #89 (network-dependent backend tests) + the 4 chronic backend test failures.
Diagnosis only — no source changed, no real PostGrid/OIDC traffic sent.

## Basis of this report (read first)

- Runtime evidence gathered on the local checkout `/Users/nick/Documents/Projects/fam-mail`,
  branch `feat/editor-shell` @ `d17eccd` — which is the **merge-base of `main@1e89725`**
  (verified: `git merge-base HEAD 1e89725` → `d17eccd19b3…`). Everything below was
  **measured** at `d17eccd`.
- PR #109 (`1e89725`, nightshift-day2) is `d17eccd` **plus**: `drafts.test.ts` JWT fix (#101 —
  32-char secret at line 20 there), `jwtService.test.ts` expiry-sleep fix (#90),
  +3 route-level postcard persistence tests, +107 lines in `postgrid.test.ts`,
  changes in `server.test.ts`/`server.ts`/`postcards.ts`/`database`.
  **Unchanged** between the two refs, so the core analysis holds verbatim on `main`:
  `config.test.ts`, `api-v1.test.ts`, `config/index.ts`, `services/postgrid.ts`.
- Method: 2× full suite under the documented env; per-test isolation A/B runs; and a
  **fetch-blocking probe** (`/tmp/qa-netprobe.ts`, outside the repo) that replaces
  `globalThis.fetch`, records every real egress attempt (url/method/key/stack) to
  `/tmp/qa-netprobe-calls.jsonl`, and throws instead of connecting. Zero requests
  actually left the machine during this audit.
- Artifacts: `/tmp/qa-baseline-run1.txt`, `/tmp/qa-baseline-run2.txt`,
  `/tmp/qa-netprobe-full.txt`, `/tmp/qa-netprobe-devmode.txt`, `/tmp/qa-postcards-leaked.txt`,
  `/tmp/qa-piggyback.txt`, `/tmp/qa-netprobe-calls.jsonl`.

## Results

| Check | Status | Details |
|-------|--------|---------|
| Backend suite (`POSTGRID_MOCK=true DEV_MODE=true pnpm test`) | FAIL | 697 pass / 1 skip / 4 fail of 702, 5.32s (run 1); run 2 identical fail set, 5.27s |
| Backend suite (no env at all, egress blocked — CI-like) | FAIL + LEAKY | 658 pass / 43 fail / 24 errors; **46 real egress attempts recorded** |
| Backend suite (`DEV_MODE=true` only, egress blocked) | FAIL + LEAKY | 700 pass / 1 fail; **6 real egress attempts recorded** |
| Chronic-4 isolation A/B | DIAGNOSED | all 4 fail alone WITH mock, pass alone WITHOUT mock — deterministic, not flaky |
| Frontend `npx vitest run` (one-shot) | PASS | 281/281, 21 files, 6.63s, clean exit (no hang) |
| Frontend env-pollution exposure | PASS | no test reads `import.meta.env`; `API_BASE_URL` default safe (see Part C) |
| Backend lint / build, frontend lint / build, audit, docker | NOT RUN | out of scope for this dispatch (hermeticity diagnosis only) |

---

## Part A — real network I/O in the backend suite (issue #89)

### The three outbound call sites

| # | Call site | Endpoint | Guard that makes it skip network |
|---|-----------|----------|----------------------------------|
| 1 | `backend/src/services/postgrid.ts:159` (`createPostcard`) | `POST https://api.postgrid.com/print-mail/v1/postcards` | `this.mockMode` (postgrid.ts:106) → returns fake card |
| 2 | `backend/src/services/postgrid.ts:218` (`checkHealth`) | `GET https://api.postgrid.com/print-mail/v1/letters` | `this.mockMode` (postgrid.ts:206) → returns `{status:"up"}` |
| 3 | `backend/src/services/oidcService.ts:24` (`client.discovery`) via `server.ts:92` (`await oidcService.initialize()` at module import) | `GET {OIDC_ISSUER_URL}/.well-known/openid-configuration` (tests point at accounts.google.com) | `config.devMode` (server.ts:81: `if (!config.devMode)`) |

(`imap.ts:111` is IMAP protocol, not HTTP — `imap.test.ts` never connects (probe: 0 attempts).
`llm.ts:101` is only reached from `llm.test.ts`, which stubs `global.fetch` (probe: 0 attempts).)

### How the singleton goes real without POSTGRID_MOCK

`postgrid.ts:261-280` auto-initializes a module-level singleton **at first import**:

- `mockMode: (process.env.POSTGRID_MOCK || '').toLowerCase() === 'true'` (postgrid.ts:272) is
  read **once, at import time**. If `POSTGRID_MOCK` is not yet set but a `POSTGRID_*_API_KEY`
  is, the singleton is a **real service**. Setting the env later does nothing (module cache).
- bun runs all 22 test files in **one process** with shared `process.env` and shared module
  singletons. `api-v1.test.ts:27` (beforeAll) sets `POSTGRID_TEST_API_KEY='pg_test_123'` and
  never restores it; `drafts.test.ts:13-14` and `auth.test.ts:12-13` also set keys at
  **module top level**. So by the time `postcards.test.ts` (the first *value* importer of
  `services/postgrid.ts` in the leak scenario) evaluates the module, a junk key is present
  and `POSTGRID_MOCK` is absent → real singleton.

### Part A table — every egress-capable test, trigger, measured risk, fix

| Tests (file) | What triggers the call | Measured egress (probe) | Risk rank | Hermetic fix |
|---|---|---|---|---|
| ~45 route tests in `postcards.test.ts` (every "accepts"/`not.toBe(400)` test; 71 such assertions, 45 reach the service) | Cross-file leak → real singleton → `handlePostcardCreate` → `createPostcard` (postcards.ts:121). Alone, the file is accidentally clean (module init runs before its `beforeAll` sets keys → singleton null → 500, which still passes `not.toBe(400)`). In the combined run it fires. | **45× POST `/print-mail/v1/postcards`, `x-api-key: pg_test_123`** in one bare `bun test` (probe run 1). Reproduced alone: `POSTGRID_TEST_API_KEY=pg_test_123 bun test src/routes/postcards.test.ts` → 45 attempts, **159 pass / 0 fail** — green-but-networked (401 ≠ 400). At `1e89725` expect ≈48 (+3 new persistence tests). | **P1 — the scary set.** With a real `POSTGRID_TEST_API_KEY` (or `POSTGRID_MODE=live` + live key — note bun auto-loads `backend/.env` if present; none exists on this machine) these become 45–48 **real card-creation API calls**. No rate limiter in the path: tests call `handlePostcardCreate` directly. Payload = `URLSearchParams` with the John Doe / Jean Tremblay fixtures + `backHTML`/`size` (postgrid.ts:123-157). | Inject a mock service in `postcards.test.ts` `beforeAll` (line ~16): `setPostgridService(new PostGridService({ mode:'test', testApiKey:'t', liveApiKey:'l', forceTestMode:false, mockMode:true, webhookSecret:'', size:'6x4', senderId:'' }))`. Same pattern already exists at postcards.test.ts:1299-1326 (WebP test). Kills all POSTs in **every** ordering, independent of env. |
| `server.test.ts` health/CORS tests — "GET /api/health" family: lines 65-91 (2×), 719-728 (preflight, no fetch), 730-738, 859-865, 867-874 | `/api/health` → `server.ts:357 postgrid.checkHealth()` → `postgrid.ts:218` GET `/letters` whenever the service is non-mock (server.ts:120-132 builds it from `getConfig()`). | **6× GET `/print-mail/v1/letters`, `x-api-key: pg_test_123`** (`DEV_MODE=true bun test src/server.test.ts` + probe). Any HTTP response (incl. 401) returns "up", so tests stay green while networked — this is why `server.test.ts` alone took 1.54s unmocked vs 703ms mocked. | **P2.** Real calls with whatever key is in env; masks latency/outage flakiness. | In `server.test.ts` `beforeAll` (after `import('./server')`): `spyOn(postgrid, 'checkHealth').mockResolvedValue({ status: 'up' })`. Note `/api/health` and the mode routes use server.ts's **closure** `postgrid`, not the registry — spying on the exported instance is the correct boundary. |
| `api-v1.test.ts` (all) and `server.test.ts` (all) — module import | `await import('./server')` (api-v1.test.ts:47, server.test.ts:40). Without `DEV_MODE`, server.ts:81-92 constructs the OIDC service and **awaits discovery at import time**. | **1× GET `https://accounts.google.com/.well-known/openid-configuration`** per process (CI-like probe run; 1 per file when run alone). When blocked, `import('./server')` throws → 43 test failures + 24 errors cascade. | **P2.** Suite is unrunnable offline/behind a proxy; import-time network is the most fragile shape. | In `api-v1.test.ts` `beforeAll` (it is the **process owner** of `./server` — runs first alphabetically and its env wins): add `process.env.DEV_MODE = 'true'` before `import('./server')` (server.test.ts already behaves fine under DEV_MODE; its own env block can add the same line for standalone runs). |
| Guard rail (missing) | Any future unmocked fetch | — | P2 | Optional `backend/bunfig.toml` with a `preload` that turns any real egress into a hard failure (the probe in /tmp can be promoted into `backend/tests/net-guard.ts`). This makes the mock boundary **enforced**, not conventional. |

Already hermetic (probe: 0 attempts) — do not regress these patterns:
`drafts.test.ts` (constructor-injected mock postgrid, drafts.test.ts:26-70),
`scheduler.test.ts` (mockMode service + `spyOn` injection, scheduler.test.ts:15-31),
`postgrid.test.ts` / `llm.test.ts` (per-test `global.fetch` stubs), webhook/auth/middleware/utils.
Minor: `postgrid.test.ts:29` and `llm.test.ts:47` overwrite `global.fetch` and never restore —
harmless today only because `services/*` runs late alphabetically; a `afterEach` restore is cheap insurance.

### The scary set, in one sentence

A bare `pnpm test` in `backend/` (no `POSTGRID_MOCK`) makes **46–55 real HTTP calls**:
**45 POSTs to PostGrid's postcard-creation endpoint** (≈48 on `main@1e89725`), **6 GETs** to
PostGrid's letters endpoint, **1 GET** to Google's OIDC discovery — all with junk keys today
(401s), but with a real key in the environment they are **45–48 real card-creation attempts
and there is no rate limiter between the tests and PostGrid**.

---

## Part B — the 4 chronic failures, root-caused

**Headline: none of the 4 are ordering/pollution flakiness. Each fails deterministically,
even fully isolated, whenever `POSTGRID_MOCK=true` is in the environment — the documented
run command itself. All four assert pre-mock-mode semantics that mock mode deliberately
changed.** Evidence: isolation A/B matrix (each run standalone):

| Test | Alone WITH `POSTGRID_MOCK=true DEV_MODE=true` | Alone WITHOUT mock |
|---|---|---|
| `Configuration > should throw on missing required config` | **FAIL** — "Expected substring: POSTGRID_TEST_API_KEY is required / Received function did not throw" | PASS |
| `Agent API /api/v1 > POST /api/postgrid/mode admin check > allows a configured admin to toggle mode` | **FAIL** — expected 200, received 400 | PASS |
| `Backend Server > PostGrid mode API > GET /api/postgrid/status returns mode and mockMode when authenticated` | **FAIL** — expected `mockMode` false, received true | PASS |
| `Backend Server > PostGrid mode API > POST /api/postgrid/mode switches to live then back to test` | **FAIL** — expected 200, received 400 | PASS |

### (1) `config.test.ts:67-70` — "should throw on missing required config"

- Test: `delete process.env.POSTGRID_TEST_API_KEY; expect(() => getConfig()).toThrow("POSTGRID_TEST_API_KEY is required")`.
- Mechanism: since mock mode, `config/index.ts:190-191` no longer requires the keys —
  `testApiKey: isMock ? getEnv("POSTGRID_TEST_API_KEY", "mock-test-key") : getEnvRequired(...)` and same for
  `liveApiKey`. Under `POSTGRID_MOCK=true` (with `DEV_MODE=true` covering OIDC/JWT fallbacks) `getConfig()`
  returns normally → nothing throws.
- **Minimal fix** (config.test.ts:68): delete the flag too, and restore it —
  ```ts
  it("should throw on missing required config", () => {
    const prevMock = process.env.POSTGRID_MOCK;
    const prevKey = process.env.POSTGRID_TEST_API_KEY;
    delete process.env.POSTGRID_MOCK;          // under mock, keys are not required (config/index.ts:190)
    delete process.env.POSTGRID_TEST_API_KEY;
    try {
      expect(() => getConfig()).toThrow("POSTGRID_TEST_API_KEY is required");
    } finally {
      if (prevMock !== undefined) process.env.POSTGRID_MOCK = prevMock;
      if (prevKey !== undefined) process.env.POSTGRID_TEST_API_KEY = prevKey;
    }
  });
  ```

### (2) `api-v1.test.ts:312-322` — "allows a configured admin to toggle mode"

- Flow: admin posts `{mode:'test'}` → server.ts:426-462 route → admin check passes →
  `postgrid.setRuntimeMode(mode)` (server.ts:457) → **`postgrid.ts:93-96` throws
  `"Cannot change PostGrid mode while mock mode is enabled"`** because server.ts:120-129 built
  the closure service with `mockMode: config.postgrid.mockMode` = true from the ambient env →
  caught at server.ts:458-460 → 400 → `expect(res.status).toBe(200)` fails (line 321).
- The route behavior is **correct** (mock mode must not be toggleable); the test asserts non-mock
  semantics on a service it doesn't control.
- **Minimal fix** (api-v1.test.ts, in `beforeAll` right after `postgrid = module.postgrid`, or at
  the top of this test): force the shared instance non-mock for this suite —
  ```ts
  // The mode API must behave as the real (non-mock) service; ambient POSTGRID_MOCK=true
  // makes setRuntimeMode throw by design (postgrid.ts:93-96).
  (postgrid as unknown as { mockMode: boolean }).mockMode = false
  ```
  (2 lines incl. comment; restores nothing because this suite owns the process-wide `./server`
  instance — it is the first importer.) Alternative without the cast: add a small public test
  hook to `PostGridService` (src change — Sam's call; the cast is the zero-src-change version).

### (3) `server.test.ts:425` @d17eccd / `:426` @1e89725 — GET status "returns mode and mockMode"

- `expect(data.mockMode).toBe(false)` — under ambient mock, `getStatusPayload()` (postgrid.ts:82-87)
  truthfully reports `{ mode:'mock', mockMode:true }`.
- **Minimal fix** (1 line): assert the actual contract — the endpoint mirrors the service:
  ```ts
  expect(data.mockMode).toBe(postgrid.isMockMode())
  ```
  (`isMockMode()` exists at postgrid.ts:75-77; `postgrid` here IS the module instance from
  server.test.ts:43.) This passes under any env and still pins the mirror relationship.

### (4) `server.test.ts:473-503` @d17eccd / `:474-505` @1e89725 — "switches to live then back to test"

- Same mechanism as (2): first `setRuntimeMode('live')` throws under mock → route 400 →
  `expect(resLive.status).toBe(200)` fails at server.test.ts:487.
- **Minimal fix**: same 1-line `mockMode = false` reset as (2), placed in this test (or in the
  `describe('PostGrid mode API')` body just before the tests). The existing `afterEach` at
  server.test.ts:401-407 already restores runtime mode to `'test'`, so no other cleanup is
  needed. The non-admin/invalid-mode/401 tests in the same describe are unaffected (they never
  reach `setRuntimeMode`).

### Pollution issues that are REAL but are NOT these failures

- `drafts.test.ts:13-19` and `auth.test.ts:12-22` set env at **module top level** (runs at
  file-import). This is what feeds the Part A leak (keys present when `postgrid.ts` first
  evaluates). At `1e89725` the 27-char `JWT_SECRET` (issue #101) is fixed (line 20 there is
  `"test-jwt-secret-key-at-least-32-chars"`); the top-level-assignment pattern remains.
  Follow-up: move both blocks into `beforeAll` + save/restore in `afterAll`.
- `api-v1.test.ts:72-82` spies `postgrid.createPostcard` and only `mockClear()`s it (afterEach
  line 84-86) — never restores the implementation. Proven effect: with `DEV_MODE=true` and no
  mock, `bun test src/api-v1.test.ts src/routes/postcards.test.ts` → **0 egress, 179 pass** —
  the 45 postcards "accepts" tests silently ride the api-v1 spy. That's the suite working by
  accident of file order; the Part A injection fix (postcards owns its mock) removes the accident.
- `server.test.ts` itself models the good restore pattern (db.checkHealth override + finally
  restore, lines 103-163).
- Stale lead from issue #101's follow-on: "jsonResponse > includes all CORS headers" failing in
  CI — **no test by that name exists** at `d17eccd` or `1e89725` (grep across `backend/src`).
  `webhook.test.ts:6-9` references a removed `response.test.ts` as a mock-pollution source.
  Treated as stale/not reproducible at these refs.

---

## Part C — suite health snapshot

- **Runtime**: 5.32s / 5.27s (runs 1 & 2), 702 tests / 22 files, 1629 expect() calls.
- **Flakiness**: none demonstrable. Two full runs under the documented env produced
  **identical failure sets** (diff of fail lines differs only in timings). The 43-failure
  no-env probe run is deterministic fallout of blocking import-time OIDC discovery, not flake.
- **10 slowest tests** (run 1, d17eccd — note: the top 3 are fixed on `main@1e89725` by #90's
  `signAlreadyExpired` helper, which signs an already-expired token instead of sleeping 1.1s):

  | ms | Test |
  |---|---|
  | 1103.96 | JWTService > extractUserIdFromToken > returns null for expired token |
  | 1103.74 | JWTService > verifyRefreshToken > rejects an expired refresh token |
  | 1103.18 | JWTService > verifyToken > throws for an expired token |
  | 53.42 | requestLogger > withRequestLogging() > measures duration accurately |
  | 20.16 | validateImage > valid image at exactly 10MB boundary > accepts exactly 10MB |
  | 17.21 | Agent API /api/v1 > POST /api/v1/postcards > creates a postcard with a valid x-api-key |
  | 13.12 | validateImage > 10MB + 1 byte rejection |
  | 9.83 | Agent API /api/v1 > POST /api/postcards body size cap > 413 |
  | 8.20 | Agent API /api/v1 > fails closed when ADMIN_EMAILS not configured |
  | 7.96 | handlePostcardCreate — Image Validation > rejects oversized image |

  The three JWT sleeps are ~62% of total suite time at `d17eccd`; already gone on `main`.
- **Frontend env-pollution exposure**: NONE found — nightshift fix holds.
  `frontend/src/utils/apiConfig.ts:9` is the single definition (`import.meta.env.VITE_API_URL ?? ''`
  → relative `/api` paths); **no** `*.test.ts(x)` file references `import.meta.env` or
  `API_BASE_URL` (grep across `frontend/src`); `npx vitest run` → 281/281 pass, 6.63s, clean
  process exit (no jsdom hang). `setupTests.ts` sets only `window.matchMedia`.
- **CI context** (`.github/workflows/ci.yml`, "Test backend" step, ~line 37-38):
  `cd backend && pnpm test` with **no env vars**. So CI always: (a) runs the OIDC discovery GET
  at import (no `DEV_MODE`), (b) runs `server.test.ts` health tests against the real endpoint,
  (c) skips the postcards POSTs **only** because api-v1's un-restored spy happens to cover them,
  (d) at `d17eccd` additionally fails the whole `DraftRoutes` suite on the 27-char JWT (#101 —
  already fixed at `1e89725`). No `.env` exists in `backend/` or repo root on this machine;
  if one is added with real keys, bun auto-loads it and Part A's scary set goes live.

## Recommendations (ranked, for Sam)

1. `postcards.test.ts` `beforeAll`: inject a `mockMode:true` service via `setPostgridService`
   (kills 45–48 POSTs; ~5 lines; 1 file).
2. `api-v1.test.ts` `beforeAll`: `process.env.DEV_MODE = 'true'` before `import('./server')`
   (kills the Google OIDC discovery; 1 line; must be in THIS file — it owns the shared module).
3. `server.test.ts` `beforeAll`: `spyOn(postgrid, 'checkHealth').mockResolvedValue({status:'up'})`
   (kills 6 GET `/letters`; 1 line).
4. Chronic-4 fixes as specified in Part B: config.test.ts:67-70 (POSTGRID_MOCK delete/restore),
   server.test.ts GET-status assertion (`isMockMode()` mirror), server.test.ts + api-v1.test.ts
   mode-toggle `mockMode=false` reset.
5. Follow-up hygiene: move drafts.test.ts:13-19 / auth.test.ts:12-22 env into beforeAll with
   restore; restore `global.fetch` stubs in postgrid.test.ts / llm.test.ts.
6. Enforcement (recommended): promote `/tmp/qa-netprobe.ts` into `backend/tests/net-guard.ts`
   behind a `bunfig.toml` preload so any unmocked egress fails loudly instead of 401-ing quietly.

**Estimated effort**: ~half a day. Files touched: `postcards.test.ts`, `api-v1.test.ts`,
`server.test.ts`, `config.test.ts` (all test-only; no `src/` changes required), plus optional
`bunfig.toml` + `tests/net-guard.ts` and the hygiene follow-ups in `drafts.test.ts`,
`auth.test.ts`, `postgrid.test.ts`, `llm.test.ts`. Verify with the A/B matrix:
full suite ×  under (a) `POSTGRID_MOCK=true DEV_MODE=true` → expect 702/702, (b) bare
`bun test` + net-guard → expect 702/702 and 0 recorded egress.

## Overall verdict: **FAIL** (suite green only under `POSTGRID_MOCK=true`, leaks 46–55 real
HTTP calls without it; 4 chronic failures are deterministic mock-semantics conflicts with
mechanical one-file fixes) — hardening-ready, fix plan above.
