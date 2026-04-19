# Fam Mail - Agent Guide

## Project Overview
Fam Mail is a web application that converts emails and manual submissions into physical postcards via PostGrid. Built with Bun (backend) and React + Vite (frontend).

## Architecture
- **Backend**: Bun + TypeScript, SQLite, PostGrid API integration, OIDC auth
- **Frontend**: React 18, Vite, Tailwind CSS + DaisyUI 5, React Router v7
- **API**: RESTful JSON API on port 8484
- **Auth**: OIDC → JWT sessions

## Key Directories
- `backend/src/` - API routes, services, middleware, models
- `frontend/src/` - React components, pages, hooks, utils
- `frontend/src/pages/` - DashboardPage, CreatePage (wizard)
- `frontend/src/components/wizard/` - PhotoStep, MessageStep, AddressStep, ReviewStep
- `frontend/src/components/postcard/` - PostcardPreview (flip animation)
- `docs/` - Architecture, deployment, contributing guides

## Development Commands
```bash
# Backend
cd backend && pnpm install && pnpm dev          # Start backend (port 8484)
cd backend && bun test                           # Run 705+ backend tests
cd backend && pnpm lint                          # Lint backend

# Frontend  
cd frontend && pnpm install && pnpm dev          # Start frontend (port 5173)
cd frontend && npx vitest run                    # Run 196+ unit tests
cd frontend && npx playwright test               # Run 38 E2E tests
cd frontend && pnpm lint                         # Lint frontend
cd frontend && pnpm build                        # Production build
```

## Testing Strategy
- Backend: Bun test runner, 705+ tests, mock PostGrid via POSTGRID_MOCK=true
- Frontend unit: Vitest + Testing Library, 196+ tests
- Frontend E2E: Playwright, 38 tests (desktop Chrome + mobile WebKit)
- All tests mock external APIs (PostGrid, OIDC)

## PostGrid Mock Mode
Set `POSTGRID_MOCK=true` in `.env` to run without real PostGrid API keys. The backend returns fake postcard responses. Use this for:
- Local development
- CI/CD
- Agent QA testing

## Common Issues
- Frontend vitest hangs after completion due to jsdom timer leaks — use `npx vitest run` (not `pnpm test`) and kill after pass
- Backend requires `OIDC_*` and `JWT_SECRET` env vars — copy from `.env.example`

## Code Style
- TypeScript strict mode
- No `any` types
- DaisyUI components only (no raw Tailwind forms)
- Controlled inputs (no react-hook-form)
- Each wizard step is a self-contained component
