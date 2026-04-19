# CLAUDE.md — fam-mail

## Project Overview
Fam-mail is a web application for sending physical postcards to friends and family via PostGrid. It has a Bun+TypeScript backend, React+Vite frontend, and SQLite database.

## Architecture
- **Backend**: `backend/` — Bun server, manual HTTP routing, SQLite, PostGrid API
- **Frontend**: `frontend/` — Vite + React 18 + Tailwind + DaisyUI
- **Monorepo**: pnpm workspaces (`pnpm-workspace.yaml`)
- **Database**: SQLite at `DATABASE_PATH` (default `./data/fam-mail.db`)
- **CI**: GitHub Actions (`.github/workflows/ci.yml`)

## Commands
```bash
# Always use pnpm, never npm or yarn
cd backend && pnpm test          # Backend tests (bun test)
cd frontend && pnpm test -- --run # Frontend tests (vitest)
cd backend && pnpm lint          # Backend lint
cd frontend && pnpm lint         # Frontend lint
cd backend && pnpm build         # Backend build
cd frontend && pnpm build        # Frontend build (vite)
```

## Rules
- **Never run pnpm dev** — rely on tests and linting to verify changes
- **Use pnpm** — never npm or yarn
- **PostGrid sends physical mail** — validation errors cost real money
- **All inputs must be validated** — addresses, images, messages, everything
- **Tests required** — every change needs corresponding test coverage
- **Atomic commits** — one logical change per commit, reference issue numbers

## Current State (Beta 1.0.0)
- IMAP/LLM pipeline is PAUSED (code still in tree but not the focus)
- Web UI postcard builder is the primary focus
- Auth (OIDC+JWT) backend exists, frontend not wired
- Drafts API backend exists, frontend not wired
- CI on main is failing (last 4 runs)
- See PROGRESS.md for detailed status

## Key Files
| File | Purpose |
|------|---------|
| `backend/src/server.ts` | Main request handler, all route dispatch |
| `backend/src/config/index.ts` | Environment variable parsing |
| `backend/src/services/postgrid.ts` | PostGrid API client |
| `backend/src/routes/postcards.ts` | Postcard creation endpoint |
| `backend/src/routes/drafts.ts` | Draft CRUD endpoints |
| `backend/src/routes/auth.ts` | OIDC auth endpoints |
| `frontend/src/App.tsx` | Main React app |
| `.github/workflows/ci.yml` | CI pipeline |
| `PROGRESS.md` | Release progress tracker |

## Project Board
https://github.com/users/NickLewanowicz/projects/4
- Status: Backlog → Ready → In progress → In review → Done
- Priority: P0, P1, P2
- Size: XS, S, M, L, XL

## Known Issues
1. `getConfig()` requires IMAP vars even when IMAP is paused
2. Dockerfile references `backend/pnpm-lock.yaml` which doesn't exist
3. Auth callback redirect to `/auth/callback` has no frontend route
4. Draft publish doesn't call PostGrid yet
