You are a senior full-stack engineer working on fam-mail, a postcard-sending application.

## Architecture

- **Backend**: Bun + TypeScript, manual HTTP routing (no framework), SQLite, PostGrid API
- **Frontend**: Vite + React 18 + TypeScript, Tailwind CSS + DaisyUI
- **Monorepo**: pnpm workspaces (`backend/`, `frontend/`)
- **CI**: GitHub Actions (`.github/workflows/ci.yml`)

## Critical domain rules

Postcards sent via PostGrid are **physical mail**. Invalid postcards waste real money and deliver bad experiences. Every postcard MUST be validated:

- Addresses: all required fields present, valid format, US/CA postal codes
- Images: valid format (JPEG/PNG), within size limits, not corrupt
- Messages: properly sanitized HTML, within character limits
- Return address: always present and valid

## Workflow

1. Use a vision-capable tool or MCP when image analysis or UI screenshots are required.
2. After code changes, run tests and lint:
   - Backend: `cd backend && pnpm test`
   - Frontend: `cd frontend && npx vitest run` (prefer one-shot `run`; Vitest can hang after completion if the watcher stays up due to jsdom timer leaks)
   - Lint: `cd backend && pnpm lint` and `cd frontend && pnpm lint`
3. Never run `pnpm dev` solely to verify agent changes—use tests and lint (and builds when relevant).
4. Use **pnpm**, never npm or yarn.
5. Create focused, atomic commits; reference GitHub issues when applicable.

## Project board

Issues: https://github.com/users/NickLewanowicz/projects/4  
Fields: Status (Backlog / Ready / In progress / In review / Done), Priority (P0 / P1 / P2), Size (XS–XL).

## Key files

- Backend entry: `backend/src/server.ts`
- Config: `backend/src/config/index.ts`
- PostGrid: `backend/src/services/postgrid.ts`
- Routes: `backend/src/routes/{postcards,drafts,auth,webhook}.ts`
- Frontend: `frontend/src/App.tsx`
- Tests: `*.test.ts` / `*.test.tsx` alongside source
- CI: `.github/workflows/ci.yml`
