# Agent Changelog

Auto-generated executive summaries from the fam-mail agent orchestrator.

---

## [2026-04-19 10:51] Progress on #51: [P2/Bug] Image validation accepts inconsistent formats across components

Attempt 1. 15 tools, 0 commits. QA: RED.

---

## [2026-04-19 10:49] Closed #54: [P2/Enhancement] Static file responses lack security headers in production

The fix is exactly right — focused, atomic changes:

1. **Added `applyHeaders` to the import** from `./middleware/headers`
2. **Wrapped both static file responses** with `applyHeaders()` so they get CSP, X-Frame-Options, HSTS, CORS, and all other security headers

IMPLEMENTATION_COMPLETE

**Issues closed:** #54

**Files changed:** 1

**Tests:** All passing (GREEN)

---

## [2026-04-19 10:45] Closed #55: [P2/Bug] OIDC state store is in-memory Map with no expiry — memory leak

via `StateEntry.createdAt`) and lazy `evictExpired()` on access were already in place

**`backend/src/routes/auth.test.ts`** (commit `8a478d4`):
- Fixed the "evicts expired states on callback" test — the previous monkey-patching approach was incorrect (it set `Date.now` to the past before creating a second entry, but the original entry was still fresh)
- Correct approach: advance `Date.now` 11 min

**Issues closed:** #55

**Files changed:** 2

**Tests:** All passing (GREEN)

---

## [2026-04-19 10:38] Progress on #55: [P2/Bug] OIDC state store is in-memory Map with no expiry — memory leak

Attempt 1. 5 tools, 0 commits. QA: GREEN.

---

## [2026-04-19 10:36] Closed #56: [P2/Enhancement] Health endpoint leaks service configuration to unauthenticated users

IMPLEMENTATION_COMPLETE

**Summary**: Fixed issue #56 by reducing the unauthenticated `/api/health` endpoint response from `{ status, version, timestamp }` to just `{ status: "ok" }`. This prevents information disclosure where attackers could determine the application version and server time. Updated the test to verify the response contains exactly one key (`status: "ok"`).

**Issues closed:** #56

**Files changed:** 1

**Tests:** All passing (GREEN)

---

## [2026-04-19 10:33] Closed #58: [P2/Enhancement] Webhook btoa() stack overflow on large attachments

Commit succeeded. Only the 3 relevant test files were included — the unrelated files (`CHANGELOG_AGENT.md`, orchestrator scripts, logs) were left unstaged.

IMPLEMENTATION_COMPLETE

**Issues closed:** #58

**Files changed:** 1

**Tests:** All passing (GREEN)

---

## [2026-04-19 10:19] Closed #18: [Bug]: getConfig() requires IMAP env vars even though IMAP is paused for Beta

led |
| **#22** | Missing comprehensive postcard input validation test suite | Gaps in validation coverage |
| **#17** | PostGrid env var naming mismatch | Postcard sending broken |

---

## 🟡 P1/P2 Backlog Items (Lower Priority)

- #34 — Centralize CORS/security headers
- #27 — 50 `no-explicit-any` lint warnings
- #25 — Remove stale dev files and dead code
- #45 — Frontend env vars (API URL hardc

**Issues closed:** #18

**Files changed:** 1

**Tests:** All passing (GREEN)

---

## [2026-04-19 10:13] Closed #19: [Bug]: Dockerfile references non-existent backend/pnpm-lock.yaml

The issue was already resolved in a prior commit (`00aa7a8`). The current state of the codebase is correct:

- **Dockerfile**: Uses root `pnpm-lock.yaml` with proper monorepo workspace setup
- **docker-compose.yml**: Uses `bun -e fetch(...)` for healthcheck (no `curl` dependency)
- **Tests**: 666 backend pass, ~160 frontend pass
- **Lint**: Clean on both backend and frontend

Issue #19 has been cl

**Issues closed:** #19

**Tests:** All passing (GREEN)

---

## [2026-04-19 10:09] Progress on #19: [Bug]: Dockerfile references non-existent backend/pnpm-lock.yaml

Attempt 2. 13 tools, 0 commits. QA: GREEN.

---

## [2026-04-19 10:05] Progress on #19: [Bug]: Dockerfile references non-existent backend/pnpm-lock.yaml

Attempt 1. 13 tools, 0 commits. QA: GREEN.

---

## [2026-04-19 10:02] Closed #20: [Feature]: Wire frontend authentication (OIDC login/callback)

rapped in `AuthProvider`.

2. **Updated `Header.tsx`** — Added user info display (name/avatar), sign out button, and auth-aware rendering using `useAuth()`.

3. **Fixed auth components for React Router** — Replaced `window.location.href` redirects with `<Navigate>` components in `AuthCallbackPage`, `LoginPage`, and `ProtectedRoute`. Added error propagation via URL search params.

4. **Added `react

**Issues closed:** #20

**Files changed:** 1

**Tests:** All passing (GREEN)

---

## [2026-04-19 09:52] Progress on #20: [Feature]: Wire frontend authentication (OIDC login/callback)

Attempt 1. 59 tools, 0 commits. QA: RED.

---

## [2026-04-19 09:36] Closed #21: [Feature]: Wire frontend drafts management UI

 `SaveDraftModal.tsx` (detects `existingDraftId`) + `draftApi.ts::updateDraft()` |
| **Delete draft** | `DraftCard.tsx` Delete button → `DraftList.tsx::handleDelete()` → `draftApi.ts::deleteDraft()` |
| **Publish draft** | `DraftCard.tsx` Publish button → `DraftList.tsx::handlePublish()` → `draftApi.ts::publishDraft()` |
| **Tests** | `DraftList.test.tsx` (13 tests), `DraftCard.test.tsx` (17 tests

**Issues closed:** #21

**Tests:** All passing (GREEN)

---

## [2026-04-19 09:27] Closed #24: [Task]: Security hardening - CORS, webhook secrets, .dockerignore

nv files, test artifacts, backups, IDE files, orchestrator artifacts excluded |
| **`helmet` removed** | ✅ Committed — was unused; custom security headers in `headers.ts` handle this |
| **JWT secret validation** | ✅ Committed — enforces 32-char minimum for HS256, with helpful error message |
| **CORS (`ALLOWED_ORIGINS`)** | ✅ Already correct — no changes needed |
| **Webhook signature verificatio

**Issues closed:** #24

**Files changed:** 1

**Tests:** All passing (GREEN)

---

## [2026-04-19 09:21] Closed #26: [P1/Bug] Draft publish endpoint doesn't call PostGrid API - just changes state

IMPLEMENTATION_COMPLETE

The issue was already resolved in a prior commit. The `publish()` method in `backend/src/routes/drafts.ts` already implements the full PostGrid integration flow:

- **Validation**: All required fields (address, content, size) are validated before sending
- **PostGrid call**: `this.postgrid.createPostcard(postcardRequest)` is called with properly mapped fields
- **Database 

**Issues closed:** #26

**Tests:** All passing (GREEN)

---

## [2026-04-19 09:18] Closed #28: [P1/Bug] Hardcoded colors in EnhancedInteractivePostcard.css bypass DaisyUI theming

n 1 file):

| Hardcoded Class | DaisyUI Replacement | Context |
|---|---|---|
| `bg-black/50` | `bg-neutral/50` | Loading overlay backdrop |
| `bg-white` | `bg-base-100` | Loading overlay card |
| `text-gray-600` | `text-base-content/70` | Progress text, tab labels |
| `text-gray-500` | `text-base-content/50` | Last saved timestamp |
| `bg-gray-200` | `bg-base-300` | Progress track, inactive tabs 

**Issues closed:** #28

**Files changed:** 1

**Tests:** All passing (GREEN)

---

## [2026-04-19 09:12] Closed #38: [P1/Security] frontHTML/backHTML passed to PostGrid without sanitization

itization into both route handlers**:
   - `postcards.ts` — sanitizes `frontHTML` and `backHTML` before PostGrid call
   - `drafts.ts` — sanitizes `draft.frontHTML` and `finalBackHTML` before PostGrid call

3. **Added 238 lines of test coverage** in `validation.test.ts` covering:
   - Script/iframe/object/svg injection removal
   - Event handler attribute stripping
   - Safe HTML preservation (tex

**Issues closed:** #38

**Files changed:** 1

**Tests:** All passing (GREEN)

---

## [2026-04-19 09:01] Progress on #38: [P1/Security] frontHTML/backHTML passed to PostGrid without sanitization

Attempt 1. 20 tools, 0 commits. QA: RED.

---

## [2026-04-19 08:57] Closed #40: [P1/Bug] Size format inconsistency — 4x6 vs 6x4 across codebase causes wrong postcard dimensions

ons now consistently use the PostGrid format (`6x4`, `9x6`, `11x6`):

| File | Current State |
|------|--------------|
| `config/index.ts` | ✅ `"6x4" \| "9x6"` — PostGrid format |
| `database/schema.sql` | ✅ `CHECK(size IN ('6x4', '9x6', '11x6'))` — PostGrid format |
| `models/draft.ts` | ✅ `'6x4' \| '9x6' \| '11x6'` — PostGrid format |
| `routes/drafts.ts` | ✅ default `'6x4'` — PostGrid format |


**Issues closed:** #40

**Tests:** All passing (GREEN)

---

## [2026-04-19 08:53] Orchestrator v2 Started

39 open issues. PID=7343

---

## [2026-04-19 08:46] Progress on #40: [P1/Bug] Size format inconsistency — 4x6 vs 6x4 across codebase causes wrong postcard dimensions

Attempt 1. 56 tools, 0 commits. QA: RED.

---

## [2026-04-19 08:41] Closed #41: [P1/Security] Webhook accepts unauthenticated requests when WEBHOOK_SECRET is empty

` (rejects with 401) when `POSTGRID_WEBHOOK_SECRET` is empty/not configured, with an error log
  - Removed `?secret=` query parameter acceptance — header-only auth now, preventing secret leaks in server/proxy logs
- **Updated all webhook tests** in `backend/src/routes/webhook.test.ts`:
  - All tests now use a valid webhook secret and auth header
  - Two tests flipped from "allows" → "rejects 401" 

**Issues closed:** #41

**Files changed:** 1

**Tests:** All passing (GREEN)

---

## [2026-04-19 08:33] Closed #42: [P1/Security] No rate limiting on postcard creation — financial exposure

ed
   - All draft **write** endpoints (`POST`, `PUT`, `DELETE`, `publish`, `schedule`, `cancel-schedule`) — rate limited
   - Draft **read** endpoints (`GET /api/drafts`, `GET /api/drafts/:id`) — intentionally NOT rate limited (read-only)

3. **Fixed memory leak** — added periodic `cleanup()` timer (every 5 minutes) for all rate limiters, with `unref()` so it doesn't prevent process exit.

### `ba

**Issues closed:** #42

**Files changed:** 1

**Tests:** All passing (GREEN)

---

## [2026-04-19 08:26] Orchestrator v2 Started

41 open issues. PID=43770

---

## [2026-04-19 08:23] Progress on #46: [P1/Bug] submitPostcard() sends no auth token — API will reject requests

Attempt 1. 17 tools, 1 commits. QA: RED.

---

## [2026-04-19 08:20] Progress on #52: [P1/Bug] Duplicate Draft API modules with different auth behavior

Attempt 3. 32 tools, 0 commits. QA: RED.

---

## [2026-04-19 08:16] Progress on #52: [P1/Bug] Duplicate Draft API modules with different auth behavior

Attempt 2. 35 tools, 0 commits. QA: RED.

---

## [2026-04-19 08:10] Progress on #52: [P1/Bug] Duplicate Draft API modules with different auth behavior

Attempt 1. 37 tools, 1 commits. QA: RED.

---

## [2026-04-19 08:05] Progress on #53: [P1/Bug] useLocalStorageDraft has stale closure — saves outdated draft data

Attempt 2. 18 tools, 1 commits. QA: RED.

---

## [2026-04-19 07:59] Orchestrator v2 Started

43 open issues. PID=80867

---

## [2026-04-19 07:57] Progress on #53: [P1/Bug] useLocalStorageDraft has stale closure — saves outdated draft data

Attempt 1. 23 tools, 1 commits. QA: RED.

---

## [2026-04-19 07:51] Progress on #16: [Bug]: CI pipeline failing on main - last 4 runs failed

Attempt 3. 43 tools, 0 commits. QA: RED.

---

## [2026-04-19 07:44] Progress on #16: [Bug]: CI pipeline failing on main - last 4 runs failed

Attempt 2. 42 tools, 0 commits. QA: RED.

---

## [2026-04-19 07:37] Progress on #16: [Bug]: CI pipeline failing on main - last 4 runs failed

Attempt 1. 69 tools, 0 commits. QA: RED.

---

## [2026-04-19 07:27] Progress on #17: [Bug]: PostGrid env var naming mismatch breaks postcard sending

Attempt 3. 64 tools, 1 commits. QA: RED.

---

## [2026-04-19 07:14] Progress on #17: [Bug]: PostGrid env var naming mismatch breaks postcard sending

Attempt 2. 26 tools, 1 commits. QA: RED.

---

## [2026-04-19 07:10] Progress on #17: [Bug]: PostGrid env var naming mismatch breaks postcard sending

Attempt 1. 33 tools, 1 commits. QA: RED.

---

## [2026-04-19 07:04] Progress on #22: [Task]: Add comprehensive postcard input validation test suite

Attempt 3. 47 tools, 1 commits. QA: RED.

---

## [2026-04-19 06:56] Progress on #22: [Task]: Add comprehensive postcard input validation test suite

Attempt 2. 13 tools, 0 commits. QA: RED.

---

## [2026-04-19 06:52] Progress on #22: [Task]: Add comprehensive postcard input validation test suite

Attempt 1. 47 tools, 1 commits. QA: RED.

---

## [2026-04-19 06:40] Progress on #36: [P0/Bug] updateUser() has ReferenceError — userId undefined on line 410

Attempt 3. 7 tools, 0 commits. QA: RED.

---

## [2026-04-19 06:38] Progress on #36: [P0/Bug] updateUser() has ReferenceError — userId undefined on line 410

Attempt 2. 7 tools, 0 commits. QA: RED.

---

## [2026-04-19 06:35] Progress on #36: [P0/Bug] updateUser() has ReferenceError — userId undefined on line 410

Attempt 1. 7 tools, 1 commits. QA: RED.

---

## [2026-04-19 06:32] Progress on #37: [P0/Bug] lodash imported but not in package.json — runtime crash in MessageEditModal

Attempt 3. 15 tools, 0 commits. QA: RED.

---

## [2026-04-19 06:28] Progress on #37: [P0/Bug] lodash imported but not in package.json — runtime crash in MessageEditModal

Attempt 2. 18 tools, 1 commits. QA: RED.

---

## [2026-04-19 02:03] Orchestrator v2 Started

43 open issues. PID=61865

---

## [2026-04-19 02:00] Orchestrator v2 Started

43 open issues. PID=54724

---

## [2026-04-19 01:47] Orchestrator v2 Started

43 open issues. PID=23629

---

## [2026-04-19 01:30] Progress on #43: [P0/Bug] Validation tests assume string errors but implementation returns objects — 30 tests fail

Attempt 3. 12 tools, 0 commits. QA: RED.

---

## [2026-04-19 01:24] Orchestrator v2 Started

43 open issues. PID=68764

---

## [2026-04-19 01:18] Progress on #43: [P0/Bug] Validation tests assume string errors but implementation returns objects — 30 tests fail

Attempt 1. 51 tools, 4 commits. QA: RED.

---

## [2026-04-19 01:01] Orchestrator v2 Started

43 open issues. PID=84816

---

## [2026-04-19 00:45] Orchestrator v2 Started

18 open issues. PID=21926

---

## [2026-04-19 00:36] Orchestrator v2 Started

18 open issues. PID=86858

---

## [2026-04-18 23:46] QA Fix

Addressed: backend_tests, frontend_tests, backend_lint, frontend_lint, frontend_build

---

## [2026-04-18 23:46] Progress on #17: [Bug]: PostGrid env var naming mismatch breaks postcard sending

Attempt 2. 4 tools, 0 commits. QA: RED.

---

## [2026-04-18 23:45] Progress on #22: [Task]: Add comprehensive postcard input validation test suite

Attempt 2. 11 tools, 0 commits. QA: RED.

---

## [2026-04-18 23:43] QA Fix

Addressed: backend_tests, frontend_tests, backend_lint

---

## [2026-04-18 23:43] Progress on #17: [Bug]: PostGrid env var naming mismatch breaks postcard sending

Attempt 1. 4 tools, 0 commits. QA: RED.

---

## [2026-04-18 23:41] QA Fix

Addressed: backend_tests, frontend_tests, backend_lint

---

## [2026-04-18 23:40] Progress on #22: [Task]: Add comprehensive postcard input validation test suite

Attempt 3. 6 tools, 0 commits. QA: RED.

---

## [2026-04-18 23:38] Orchestrator v2 Started

18 open issues. PID=76281

---

## [2026-04-18 23:37] Triage Scan



---

## [2026-04-18 23:37] Orchestrator v2 Started

18 open issues. PID=72304

---

## [2026-04-18 23:36] Orchestrator v2 Started

18 open issues. PID=70091

---

## [2026-04-18 23:32] Progress on #22: [Task]: Add comprehensive postcard input validation test suite

Made progress. 22 tool calls. Not yet confirmed fixed.

---

## [2026-04-18 23:30] Progress on #22: [Task]: Add comprehensive postcard input validation test suite

Made progress. 25 tool calls. Not yet confirmed fixed.

---

## [2026-04-18 23:26] QA Fix

Fixed failing checks: backend_tests, frontend_tests

---

## [2026-04-18 23:25] Progress on #22: [Task]: Add comprehensive postcard input validation test suite

Made progress. 2 tool calls. Not yet confirmed fixed.

---

## [2026-04-18 23:23] Orchestrator Started

Beginning autonomous issue resolution. Open issues: 18. Quota window: 5h.

---

## [2026-04-18 23:22] Progress on #30: [P0/Security] Postcard creation endpoint /api/postcards lacks authentication

Made progress. 20 tool calls. Not yet confirmed fixed.

---

## [2026-04-18 23:18] Progress on #30: [P0/Security] Postcard creation endpoint /api/postcards lacks authentication

Made progress. 8 tool calls. Not yet confirmed fixed.

---

## [2026-04-18 23:18] Progress on #30: [P0/Security] Postcard creation endpoint /api/postcards lacks authentication

Made progress. 13 tool calls. Not yet confirmed fixed.

---

## [2026-04-18 23:17] Progress on #30: [P0/Security] Postcard creation endpoint /api/postcards lacks authentication

Made progress. 9 tool calls. Not yet confirmed fixed.

---

## [2026-04-18 23:16] Orchestrator Started

Beginning autonomous issue resolution. Open issues: 20. Quota window: 5h.

---

