# Fam Mail

Send physical postcards through a web UI backed by [PostGrid](https://www.postgrid.com/) (printing and USPS delivery).

## What it does

Fam Mail is a small full-stack app for composing a postcard (photo, message, addresses), previewing front and back, and submitting it to PostGrid. An optional **email-to-postcard** mode can watch an IMAP mailbox, parse requests with an LLM, and create mail automatically when that stack is configured.

## Features

- **Postcard builder** — Image upload, Markdown message, US/CA address validation, live preview
- **Drafts API** — Save and resume work via the REST API (used by the UI)
- **OIDC sign-in** — Google or any OIDC provider, with JWT access and refresh cookies
- **PostGrid** — Test mode for development, live mode for real mail, optional mock mode
- **Hardening** — Central security headers, CORS, rate limits on auth and costly routes
- **SQLite** — Users, drafts, sessions, and (when enabled) email pipeline state
- **Docker** — One image: API plus built static frontend on a single port
- **Tests** — Hundreds of backend (`bun test`) and frontend (`vitest`) unit tests; Playwright available for E2E

## Tech stack

| Layer | Technology |
|-------|------------|
| Backend | Bun, TypeScript, SQLite |
| Frontend | Vite, React 18, TypeScript, Tailwind CSS, DaisyUI |
| Auth | OIDC + JWT |
| Mail | PostGrid |
| Package manager | pnpm workspaces |

## Screenshots

Screenshots are not embedded in this repository yet. After you run the app locally or via Docker, capture the login flow, create flow, and preview screens here to help new contributors and users see the UI at a glance.

## Quick start (development)

### Prerequisites

- [Bun](https://bun.sh/) 1.x
- [pnpm](https://pnpm.io/) 8+
- A PostGrid account (test keys are enough for development)

### Install

```bash
pnpm install
```

### Environment

The backend process loads `.env` from the **`backend/`** package directory when you use `pnpm dev`.

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`. Minimum for the web UI and API:

```env
POSTGRID_MODE=test
POSTGRID_TEST_API_KEY=your_test_key
POSTGRID_LIVE_API_KEY=your_live_key

OIDC_ISSUER_URL=https://accounts.google.com/.well-known/openid-configuration
OIDC_CLIENT_ID=your_google_client_id
OIDC_CLIENT_SECRET=your_google_client_secret
OIDC_REDIRECT_URI=http://localhost:8484/api/auth/callback
JWT_SECRET=your-secret-at-least-32-characters-long
```

See `backend/.env.example` and the root `.env.example` for the full variable list (IMAP, LLM, webhooks, etc.).

### Run

```bash
pnpm dev
```

- Frontend dev server: `http://localhost:5173` (proxies `/api` to the backend)
- Backend: `http://localhost:8484`

For production-like local behavior (single origin), build the frontend and run the backend with `NODE_ENV=production` so it serves `frontend/dist` from the same port as the API.

## API overview

Responses are JSON unless the server is serving static assets. Authenticated routes use `Authorization: Bearer <access_token>`.

| Area | Examples |
|------|-----------|
| Health | `GET /api/health` |
| Auth | `POST /api/auth/login`, `GET /api/auth/callback`, `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/refresh` |
| Postcards | `POST /api/postcards` |
| Drafts | `GET/POST /api/drafts`, `GET/PUT/DELETE /api/drafts/:id`, publish / schedule actions |
| Webhooks | `POST /api/webhook/email`, `GET /api/webhook/health` |

## Commands

```bash
pnpm dev          # Frontend + backend in watch mode
pnpm build        # Production build (all workspace packages)
pnpm test         # Backend + frontend unit tests
pnpm lint         # Lint all packages

pnpm --filter backend test
pnpm --filter frontend test
```

## Repository layout

```
fam-mail/
├── backend/src/     # HTTP server, routes, PostGrid, auth, DB
├── frontend/src/    # React UI
├── docs/            # Contributing and architecture notes
├── docker-compose.yml
├── Dockerfile
└── pnpm-workspace.yaml
```

Project-specific OpenCode / Claude Code configuration lives under `.opencode/` for contributors who use those tools.

## Docker

The image installs workspace dependencies, runs `pnpm build` in `frontend`, bundles the backend with `bun build`, and copies `frontend/dist` next to the backend so **one process on port 8484** serves the API and static UI.

```bash
cp .env.example .env
# Edit .env for production: secrets, OIDC redirect URL matching your public URL, etc.

docker compose up --build -d
```

Then open `http://localhost:8484` (or your host / reverse proxy). Ensure `OIDC_REDIRECT_URI` and any public URL settings match how users reach the app.

## Environment variables

See `.env.example` and `backend/.env.example`. Groupings include PostGrid, OIDC/JWT, server port and database path, optional IMAP and LLM settings for the email pipeline, and webhook secrets.

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
