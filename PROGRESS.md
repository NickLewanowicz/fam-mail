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
