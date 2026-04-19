# AGENTS.md — fam-mail

Portable project instructions for **Claude Code**, **Pi**, **OpenCode**, and other coding agents. Claude-specific notes live in root `CLAUDE.md`, which imports this file.

## Project overview

Fam-mail is a web application for sending **physical postcards** via [PostGrid](https://www.postgrid.com/). Stack: **Bun + TypeScript** backend, **React 18 + Vite** frontend, **SQLite**, **pnpm** workspaces. PostGrid prints and mails real pieces of mail—bad validation wastes money.

### Architecture

| Area | Location | Notes |
|------|----------|--------|
| Backend | `backend/` | Manual HTTP routing (no framework), SQLite, PostGrid, OIDC → JWT |
| Frontend | `frontend/` | React Router v7, Tailwind + **DaisyUI 5**, wizard-based postcard builder |
| Monorepo | `pnpm-workspace.yaml` | Always **pnpm**, never npm or yarn |
| Database | `DATABASE_PATH` (default `./data/fam-mail.db`) | SQLite |
| CI | `.github/workflows/ci.yml` | GitHub Actions |
| Docs | `docs/` | Architecture, deployment, contributing |

### Current product focus (Beta 1.0.0)

- **IMAP / LLM email pipeline is paused** (code may remain; not the active product path).
- **Primary focus**: web UI postcard builder and supporting API.
- Auth (**OIDC + JWT**) and **drafts** APIs exist on the backend; frontend wiring may be incomplete—verify in tree before assuming shipped.
- Release status and backlog: `PROGRESS.md`, GitHub project board below.

## Commands

```bash
# Install (from repo root or package dir)
pnpm install

# Backend — tests use Bun test runner
cd backend && pnpm test
cd backend && pnpm lint
cd backend && pnpm build

# Frontend — see Vitest note below
cd frontend && npx vitest run
cd frontend && pnpm lint
cd frontend && pnpm build

# E2E (when needed)
cd frontend && npx playwright test
```

### Agent / CI verification policy

- **Do not use `pnpm dev`** (backend or frontend) to “verify” agent work—use **tests and lint** (and builds when appropriate).
- Prefer **explicit `cd /path/to/fam-mail && …`** or `cd` per package so shell cwd is never ambiguous.

## Testing and quality

- **Backend**: `bun test` via `pnpm test`; mock PostGrid with `POSTGRID_MOCK=true` in `.env` for local/CI/agent runs without real API keys.
- **Frontend unit**: Vitest + Testing Library. **Vitest / jsdom timer leaks** can make the process **hang after tests finish** if the watcher stays alive—use **`npx vitest run`** (one-shot) rather than a persistent watch session. On macOS, `gtimeout 60 npx vitest run …` is acceptable when you need a hard cap.
- **E2E**: Playwright (`npx playwright test`). External services should stay mocked or test-scoped.
- **Coverage expectation**: meaningful changes should include or update tests; postcard validation especially needs edge-case coverage.

## PostGrid and validation (domain rules)

Every postcard must be validated before calling PostGrid:

- **Addresses**: required fields, sane formats, US/CA postal rules, 2-letter region and country codes.
- **Images**: JPEG/PNG, size and dimension limits, not corrupt; no SVG for print paths.
- **Messages**: sanitized HTML where applicable, length limits, no script/event handlers.
- **Return address**: present and valid (often configured, not free-form per card).

Detailed matrices and field rules: `.claude/skills/postcard-validation/SKILL.md`.

## Code conventions

- **TypeScript strict**; avoid `any`.
- **DaisyUI** for UI primitives; avoid one-off raw Tailwind form controls where a Daisy component exists.
- **Controlled inputs** in the wizard (no react-hook-form in this codebase).
- Wizard steps live under `frontend/src/components/wizard/` (e.g. photo, message, address, review); postcard preview under `frontend/src/components/postcard/`.

## Key files

| File | Purpose |
|------|---------|
| `backend/src/server.ts` | Main HTTP dispatch |
| `backend/src/config/index.ts` | Environment / config parsing |
| `backend/src/services/postgrid.ts` | PostGrid client |
| `backend/src/routes/postcards.ts` | Postcard API |
| `backend/src/routes/drafts.ts` | Draft CRUD |
| `backend/src/routes/auth.ts` | OIDC / session |
| `frontend/src/App.tsx` | App shell / routes |
| `frontend/src/pages/CreatePage.tsx` | Postcard builder wizard entry |
| `.github/workflows/ci.yml` | CI |
| `opencode.json` | OpenCode model + agent wiring |
| `.claude/nightshift.yaml` | NightShift orchestrator (Pi + Z.ai) |

## Project board

https://github.com/users/NickLewanowicz/projects/4  

Fields: Status (Backlog → Done), Priority (P0–P2), Size (XS–XL).

## Known issues and gotchas

1. **`getConfig()`** may still require IMAP-related env vars even when IMAP is paused—watch for startup failures in stripped-down `.env` files.
2. **Dockerfile** has historically referenced `backend/pnpm-lock.yaml` incorrectly—validate before relying on container builds.
3. **Auth callback** route `/auth/callback` may lack a matching frontend route—confirm router before changing auth flows.
4. **Draft “publish”** may not yet call PostGrid—confirm server code paths.
5. **Vitest hang**: prefer `npx vitest run`; do not assume `pnpm test` in watch mode exits cleanly in automation.

## Vision and UI analysis

GLM-based OpenCode models do not embed vision. For screenshots or visual QA, use the **zai MCP** (`zai-mcp-server`) tools (e.g. image analysis, UI diff) when available in the active environment; otherwise inspect components and DOM-related tests in code.

## Workflow for fixing issues

1. Reproduce with a **failing test** or minimal fixture when possible.
2. Fix in **small, reviewable commits**; reference GitHub issue numbers in commit messages when applicable.
3. Run **backend** `pnpm test` / `pnpm lint` and **frontend** `npx vitest run` / `pnpm lint` (and `pnpm build` when the change touches bundling or types).
4. For PostGrid-touching changes, confirm behavior under **`POSTGRID_MOCK=true`** and add validation tests.
5. For parallel unrelated fixes, split work or branches so each PR stays coherent.

## Execution tips (multi-agent / tools)

- When fixing several **independent** issues, parallel delegation is fine; still run a **unified test/lint pass** before merge.
- If a sandbox denies a command, retry with an explicit `cd` to the repo or package path, or narrow the command (e.g. path-scoped `pnpm`).

## OpenCode-specific layout

- **Models and permissions**: `opencode.json` at repo root.
- **Custom slash commands**: `.opencode/commands/*.md`.
- **Subagent personas**: `.opencode/agents/*.md` (OpenCode-specific; not duplicated into `.claude/` unless you intentionally migrate).

## Skills (on-demand)

| Skill | Path |
|-------|------|
| QA runbook | `.claude/skills/qa-testing/SKILL.md` |
| Postcard validation | `.claude/skills/postcard-validation/SKILL.md` |
