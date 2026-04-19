---
paths:
  - "backend/**/*.test.ts"
  - "frontend/**/*.test.ts"
  - "frontend/**/*.test.tsx"
  - "frontend/**/*vitest*"
  - ".github/workflows/**"
---

# Testing rules — fam-mail

## Commands

- **Backend**: `cd backend && pnpm test` (Bun test runner).
- **Frontend**: `cd frontend && npx vitest run` — prefer the **`run`** subcommand in automation and agent sessions.

## Vitest / jsdom

- Vitest with jsdom can **hang after all tests pass** if the process keeps handles (timers, fake clocks). Avoid watch mode in CI and agent loops.
- Do **not** rely on `pnpm test` without confirming it maps to a **non-interactive, exiting** Vitest invocation for the frontend.

## PostGrid

- Use **`POSTGRID_MOCK=true`** in `.env` for local and agent runs unless intentionally exercising the real API.
- Any change to postcard validation or PostGrid integration should include **targeted tests** for new edge cases.

## Playwright

- E2E lives under `frontend/`; run with `cd frontend && npx playwright test` when touching user flows that cross the full stack.
