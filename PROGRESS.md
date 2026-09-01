# Fam Mail Public Release - Progress Tracker

Started: 2026-04-10

## Phase 1: Security Hardening & Cleanup

### 1.1 Delete stale branches
- [ ] Local branches to delete: backup-before-rewrite-*, feature branches
- [ ] Remote branches to delete: merged feature branches

### 1.2 Add CORS env configuration
- [ ] Replace `*` with `ALLOWED_ORIGINS` env var in server.ts
- [ ] Add to .env.example
- [ ] Add to config schema

### 1.3 Add webhook secret verification
- [ ] Implement signature check in routes/webhook.ts
- [ ] Add tests

### 1.4 Update .dockerignore
- [ ] Add .env, backup files, debug artifacts

### 1.5 Remove internal/dev files
- [x] GIT_HISTORY_REWRITE_REPORT.md
- [ ] backend/src/database/*.backup*
- [x] frontend/debug-*.png
- [x] frontend/test-api.js, test-postcard-api.sh
- [x] frontend/capture_*.js
- [x] frontend/coverage_output.json
- [x] test.db files
- [ ] qa-screenshots/
- [ ] ~/ directory
- [x] AltPostcardBuilder and dead code
- [x] Visual test specs/snapshots (playwright)

### 1.6 Update .gitignore
- [x] Add patterns for backup files, test DBs, debug artifacts, capture scripts

### 1.7 Fix port inconsistencies
- [ ] Standardize test scripts on correct ports

## Phase 2: Comprehensive Automated Testing
- [ ] Backend mocks (PostGrid, OIDC, SMTP)
- [ ] Backend route tests (webhook, drafts, auth, JWT)
- [ ] Frontend MSW setup + component tests
- [ ] Integration tests
- [ ] CI coverage threshold

## Phase 3: Manual MCP Verification
- [ ] Frontend loads
- [ ] Health endpoint
- [ ] Postcard creation flow
- [ ] Auth flow
- [ ] Draft CRUD
- [ ] Lighthouse audit
- [ ] Mobile emulation
- [ ] Console errors

## Phase 4: Documentation & Final Polish
- [ ] Update README.md
- [ ] Verify .env.example
- [ ] Clean up docs/
- [ ] Final security scan

## Verification Log
| Time | Check | Result | Notes |
|------|-------|--------|-------|

## Session Log — 2026-09-01 (maintainer sprint, 11:41–13:10 EDT)

Commits: 760a5ef, 2638c2b, 852f4a6

Shipped
- Agent API /api/v1 (API_KEYS env, key:label:email) + docs/agent-api.md
- Return address now actually sent to PostGrid (was validated then dropped)
- Uploaded images now become full-bleed front artwork (were silently dropped;
  same fix on the draft publish path)
- Size-aware print canvases (back HTML used 6x4 dims for every card size)
- DOMPurify was stripping the whole print canvas: WHOLE_DOCUMENT fix
- Rich text end-to-end: underline/strikethrough/color via safe CSS allowlist
- Scheduled drafts now dispatch (birthdays/anniversaries actually send)
- Size-aware preview (11x6 aspect + labels), stepper skip-✓ fix (browser QA find),
  toolbar selection-loss fix (browser QA find)
- Coverage: frontend thresholds (branches ≥80%) scoped to src/; backend 82% lines
- E2E suites rewritten for current wizard; 19/19 green desktop+mobile
- Frontend lint fully clean (33 pre-existing errors fixed)

Verification state
- Backend: 854 tests / 0 fail, lint clean, build clean
- Frontend: 390 tests / 0 fail, lint clean, build clean, e2e 19/19
- Browser persona QA: full wizard walked on desktop + mobile viewports with
  screenshots (dev-mode + POSTGRID_MOCK)

Known gaps / next up
- ADMIN_EMAILS empty now fails closed for mode toggling (operators must set it)
- PostGrid `from` param uses inline contact fields (verify dedupe on live key)
- Dead code remains: wizard/PhotoStep, wizard/MessageStep, address/AddressForm,
  utils/postal, utils/imageProcessing, hooks/useAccessibility,
  hooks/usePerformanceOptimizations, backend src/validation/postcard.ts
- Coverage gap: CreatePage main flow (only stepper tests), server.ts routing
