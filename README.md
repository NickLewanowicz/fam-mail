# Fam Mail

[![CI](https://github.com/NickLewanowicz/fam-mail/actions/workflows/ci.yml/badge.svg)](https://github.com/NickLewanowicz/fam-mail/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Send physical postcards through a web UI backed by [PostGrid](https://www.postgrid.com/) (printing and USPS/Canada Post/Royal Mail delivery).

## What it does

Fam Mail is a full-stack app for composing postcards (photo, Markdown message, addresses), previewing front and back with country-specific safe zones, and submitting them to PostGrid for real printing and mailing. An optional **email-to-postcard** mode can watch an IMAP mailbox, parse requests with an LLM, and create mail automatically.

## Features

- [x] **5-step postcard wizard** — Destination, photo upload, rich text message, address entry, review & send
- [x] **Live preview** — Interactive 3D-flip postcard with country-specific safe zones (US, CA, GB) and real card sizes (6×4″, 9×6″, 11×6″)
- [x] **Rich text messages** — Bold, italic, underline, strikethrough, headings, lists, and text colors that render on the printed card
- [x] **Drafts** — Save and resume work; managed via the REST API
- [x] **OIDC sign-in** — Any OIDC provider (Pocket ID, Google, etc.) with JWT access/refresh tokens
- [x] **Agent API** — Static API keys (`/api/v1`) so Hermes, OpenClaw, or scripts can send postcards on your behalf
- [x] **PostGrid integration** — Test mode, live mode, or mock mode for printing and mailing
- [x] **Security** — CORS, rate limits, security headers, XSS-sanitized Markdown
- [x] **SQLite** — Users, drafts, sessions, and email pipeline state
- [x] **Docker** — Single image serving API and static frontend on one port
- [x] **Tests** — Backend (`bun test`) and frontend (`vitest`) unit tests
- [x] **Responsive** — Fully functional on mobile and desktop

## Tech stack

| Layer | Technology |
|-------|------------|
| Backend | Bun, TypeScript, SQLite |
| Frontend | Vite, React 18, TypeScript, Tailwind CSS, DaisyUI 5, Framer Motion |
| Auth | OIDC + JWT |
| Mail | PostGrid |
| Package manager | pnpm workspaces |

## Screenshots

### Desktop (1280×800)

| Photo Upload | Message Editor |
|:---:|:---:|
| ![Photo](docs/screenshots/desktop-04-photo-uploaded.png) | ![Message](docs/screenshots/desktop-05-message-editor.png) |

| Address Form | Review & Send |
|:---:|:---:|
| ![Address](docs/screenshots/desktop-06-address-form.png) | ![Review](docs/screenshots/desktop-07-review.png) |

| Sent! |
|:---:|
| ![Success](docs/screenshots/desktop-08-sent-success.png) |

### Mobile (375×812)

| Login | Dashboard | Destination |
|:---:|:---:|:---:|
| ![Login](docs/screenshots/mobile-01-login.png) | ![Dashboard](docs/screenshots/mobile-02-dashboard.png) | ![Destination](docs/screenshots/mobile-03-destination.png) |

| Photo | Message | Address |
|:---:|:---:|:---:|
| ![Photo](docs/screenshots/mobile-05-photo-uploaded.png) | ![Message](docs/screenshots/mobile-06-message.png) | ![Address](docs/screenshots/mobile-07-address.png) |

| Review | Sent! |
|:---:|:---:|
| ![Review](docs/screenshots/mobile-08-review.png) | ![Sent](docs/screenshots/mobile-09-sent.png) |

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE-1.0.0.md) | System design and data flow |
| [Deployment](docs/DEPLOYMENT.md) | Production setup, Docker, nginx |
| [API Reference](docs/API.md) | HTTP endpoints and schemas |
| [Contributing](docs/CONTRIBUTING.md) | Development workflow and PR guidelines |
| [Security Policy](SECURITY.md) | Security guidelines and vulnerability reporting |
| [Agent API](docs/agent-api.md) | Machine API keys for Hermes/OpenClaw/automation |
| [Troubleshooting](docs/troubleshooting.md) | Common self-hosting issues and fixes |
| [Environment Reference](docs/environment.md) | Every env var, default, and requirement |
| [Backups](scripts/backup.sh) | SQLite-safe backup script (Database not found: /data/fammail.db) |
| [Changelog](CHANGELOG.md) | Version history and notable changes |
| [Feature Board](docs/FEATURES.md) | Roadmap and 30-iteration enhancement log |
| [ADR Index](docs/adr/) | Architecture decision records |

## Quick start with Docker

1. Copy the environment template and set at least PostGrid and OIDC values (see [Environment variables](#environment-variables)).

   ```bash
   cp .env.example .env
   ```

2. Build and start the stack (API and static UI on **port 8484**).

   ```bash
   docker compose up --build -d
   ```

3. Open [http://localhost:8484](http://localhost:8484) (or your host / reverse proxy). Set `OIDC_REDIRECT_URI` and any public URL variables so they match how users reach the app.

For a development loop with hot reload, use [Quick start (development)](#quick-start-development) instead.

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

For quick local testing without an OIDC provider, set `DEV_MODE=true` to bypass authentication and auto-create a dev user.

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

| Area | Description |
|------|-------------|
| Health | System health and dependency checks |
| Auth | OIDC login, token management, user info |
| Postcards | Direct postcard creation and sending |
| Drafts | Draft CRUD, publish, schedule management |
| PostGrid | Service status and mode toggling (admins only) |
| Webhooks | Email-to-postcard webhook processing |
| **Agent API** | `/api/v1` — API-key auth for machine integrations (Hermes, OpenClaw) |

See [docs/API.md](docs/API.md) for full request/response schemas, authentication details, and error codes. Agents and automations: see [docs/agent-api.md](docs/agent-api.md).

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
├── docs/            # Contributing, architecture notes, README screenshots
├── docker-compose.yml
├── Dockerfile
└── pnpm-workspace.yaml
```

Agent configuration lives under `.claude/` for contributors who use AI coding tools.

## Docker (details)

The image installs workspace dependencies, runs `pnpm build` in `frontend`, bundles the backend with `bun build`, and copies `frontend/dist` next to the backend so **one process on port 8484** serves the API and static UI. The [Quick start with Docker](#quick-start-with-docker) section above covers the usual `docker compose` workflow.

## Environment variables

See `.env.example` and `backend/.env.example`. Groupings include PostGrid, OIDC/JWT, server port and database path, optional IMAP and LLM settings for the email pipeline, and webhook secrets.

## Honest limits & alternatives

Fam-mail is a small, single-maintainer tool with a narrow focus: composing
postcards and handing them to PostGrid. It is deliberately **not**:

- a CRM or full address book (recipients are entered per card),
- a marketing/bulk-mail tool (rate limits are intentionally tight — it costs
  real money per card),
- an email-to-postcard automation platform (the IMAP/LLM pipeline is paused),
- a hosted service — you run it, you own the database and the PostGrid bill.

If you need bulk mail merges, address verification APIs, or template-heavy
campaigns, look at PostGrid's own dashboard tools or a marketing-mail platform
instead. If you want a tiny, honest postcard app you can read the whole source
of in an afternoon — welcome, this is it.

## Contributing

PRs welcome. Development happens with AI assistance under human review — see
[CONTRIBUTING](docs/CONTRIBUTING.md) for the workflow and conventions.

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md). Development is AI-assisted
under human review — details in the contributing guide.

## License

MIT — see [LICENSE](LICENSE).
