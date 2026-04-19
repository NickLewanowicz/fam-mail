# Fam Mail

Send physical postcards to your loved ones through a beautiful web interface or automated email-to-postcard pipeline. Powered by PostGrid for USPS delivery.

## What is Fam Mail?

Fam Mail is a full-stack postcard-sending application with two modes of operation:

1. **Web UI** — A polished React app where users compose postcards with addresses, images, and messages, save drafts, and send physical mail via PostGrid.
2. **Email-to-Postcard** — An automated pipeline that monitors an IMAP inbox for postcard requests, parses content with an LLM, and sends the postcard without manual intervention.

**What is PostGrid?** PostGrid provides APIs for sending physical mail programmatically. Postcards are printed, addressed, and delivered via USPS. Learn more at [postgrid.com](https://www.postgrid.com/).

## Features

- **Web Postcard Builder** — Upload images, compose messages in Markdown, enter US/CA addresses, preview front and back
- **Draft System** — Save, edit, schedule, and publish drafts
- **OIDC Authentication** — Google OAuth (or any OIDC provider) with JWT sessions
- **Email-to-Postcard Pipeline** — IMAP polling, LLM-powered email parsing, automatic postcard creation
- **Comprehensive Validation** — Address format (US/CA postal codes), image type/size, message length, return address
- **PostGrid Integration** — Test mode for development, live mode for real mail, force-test safety switch
- **Rate Limiting** — Per-IP rate limiting on auth endpoints to prevent abuse
- **SQLite Database** — Track users, drafts, sessions, and processed emails
- **Docker Deployment** — Single-container deployment with Docker Compose
- **Full Test Suite** — 560+ backend tests, 70+ frontend tests, lint, build checks

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Bun + TypeScript, manual HTTP routing, SQLite |
| **Frontend** | Vite + React 18 + TypeScript, Tailwind CSS + DaisyUI |
| **Auth** | OIDC (Google) + JWT access/refresh tokens |
| **Mail** | PostGrid API (USPS postcards) |
| **Email Parsing** | IMAP + LLM (OpenRouter / Ollama / custom) |
| **Package Manager** | pnpm workspaces |
| **CI** | GitHub Actions |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [pnpm](https://pnpm.io/) (v8+)
- [PostGrid API Key](https://www.postgrid.com/) (free test key available)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example backend/.env
```

Edit `backend/.env` with your configuration. At minimum you need:

```env
# PostGrid (required)
POSTGRID_MODE=test
POSTGRID_TEST_API_KEY=your_test_key
POSTGRID_LIVE_API_KEY=your_live_key

# Auth (required for web UI)
OIDC_ISSUER_URL=https://accounts.google.com/.well-known/openid-configuration
OIDC_CLIENT_ID=your_google_client_id
OIDC_CLIENT_SECRET=your_google_client_secret
OIDC_REDIRECT_URI=http://localhost:8484/api/auth/callback
JWT_SECRET=your-secret-at-least-32-characters-long

# LLM (required for email-to-postcard)
LLM_PROVIDER=openrouter
LLM_API_KEY=your_openrouter_key
LLM_MODEL=openai/gpt-4o
```

### 3. Start Development

```bash
pnpm dev
```

Frontend: `http://localhost:5173` | Backend: `http://localhost:8484`

## API Reference

All endpoints return JSON. Authentication uses `Authorization: Bearer <jwt>` header.

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check (status, version, timestamp) |
| `POST` | `/api/auth/login` | Initiate OIDC login flow (rate-limited) |
| `GET` | `/api/auth/callback` | OIDC callback handler (rate-limited) |

### Authenticated Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/me` | Get current user profile |
| `POST` | `/api/auth/logout` | End session |
| `POST` | `/api/postcards` | Create and send a postcard |
| `GET` | `/api/drafts` | List user's drafts |
| `POST` | `/api/drafts` | Create a draft |
| `GET` | `/api/drafts/:id` | Get a specific draft |
| `PUT` | `/api/drafts/:id` | Update a draft |
| `DELETE` | `/api/drafts/:id` | Delete a draft |
| `POST` | `/api/drafts/:id/publish` | Send draft as postcard via PostGrid |
| `POST` | `/api/drafts/:id/schedule` | Schedule draft for future sending |
| `POST` | `/api/drafts/:id/cancel-schedule` | Cancel scheduled send |

### Webhook Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/webhook/email` | `WEBHOOK_SECRET` | Receive inbound email webhooks (SendGrid, Mailgun, generic) |
| `GET` | `/api/webhook/health` | None | Webhook service health |

## Commands

```bash
pnpm dev                 # Start frontend + backend in dev mode
pnpm build               # Build for production
pnpm test                # Run all tests (backend + frontend)
pnpm lint                # Lint all code

# Individual packages
cd backend && pnpm test  # Backend tests only (Bun test)
cd frontend && pnpm test # Frontend tests only (Vitest)
```

## Project Structure

```
fam-mail/
├── backend/
│   └── src/
│       ├── config/          # Environment config schema
│       ├── database/        # SQLite operations
│       ├── middleware/       # Auth, CORS, rate limiting, headers
│       ├── models/          # User, Draft, Session models
│       ├── routes/          # HTTP route handlers
│       ├── services/        # PostGrid, IMAP, LLM, notifications
│       ├── utils/           # Validation, logging, responses
│       └── validation/      # Postcard request validation
├── frontend/
│   └── src/
│       ├── components/      # React components (postcard, drafts, auth, UI)
│       ├── hooks/           # Custom hooks (draft persistence, etc.)
│       ├── services/        # API clients
│       ├── types/           # TypeScript type definitions
│       └── utils/           # Postal validation, image processing
├── docs/                    # Architecture, deployment, plans
├── docker-compose.yml
├── Dockerfile
└── pnpm-workspace.yaml
```

## Docker Deployment

```bash
cp .env.example .env
# Edit .env with production values

docker-compose up -d
# App available on port 8484
```

## Environment Variables

See `.env.example` for the complete list. Key categories:

| Category | Variables | Required |
|----------|----------|----------|
| **PostGrid** | `POSTGRID_MODE`, `POSTGRID_TEST_API_KEY`, `POSTGRID_LIVE_API_KEY` | Yes |
| **Auth** | `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `JWT_SECRET` | Yes (web UI) |
| **IMAP** | `IMAP_HOST`, `IMAP_USER`, `IMAP_PASSWORD`, `SUBJECT_FILTER` | Yes (email mode) |
| **LLM** | `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` | Yes (email mode) |
| **Server** | `PORT` (default 8484), `DATABASE_PATH`, `LOG_LEVEL` | No |

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](LICENSE) for details.
