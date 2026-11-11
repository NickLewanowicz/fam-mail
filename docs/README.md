# Fam Mail docs hub

Index of everything documented in this directory. One line per item — the
linked doc is the source of truth.

## Start here

| Document | What it is |
|----------|------------|
| [API.md](API.md) | Full HTTP API reference: auth flows, endpoints, schemas, error codes |
| [ARCHITECTURE-1.0.0.md](ARCHITECTURE-1.0.0.md) | System design and data flow for the beta |
| [product-decisions.md](product-decisions.md) | Chronological log of product decisions (decision-board outcomes) |
| [screenshots/README.md](screenshots/README.md) | Manifest of the committed screenshot set + regeneration flow |

## Architecture decision records ([docs/adr/](adr/))

| ADR | Decision (one line) |
|-----|---------------------|
| [0001](adr/0001-frontend-library-strategy.md) | Frontend library strategy: DaisyUI + radix-ui headless primitives + react-hook-form/zod for generic UI; preview and print pipeline stay custom |
| [0002](adr/0002-draft-publish-return-address.md) | Draft publish requires a sender address; recipient-as-return is a client-side materialization |
| [0003](adr/0003-auth-callback-token-delivery.md) | The OIDC callback delivers a one-time ticket, not tokens — JWTs never ride the redirect URL |
| [0004](adr/0004-postcard-pricing-source.md) | Postcard pricing comes from config and rides the PostGrid status endpoint (per-country, dashboard-sourced) |

## Guides and reference

| Document | What it is |
|----------|------------|
| [environment.md](environment.md) | Every env var, its default, and when it is required |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production setup, Docker, nginx |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development workflow and PR guidelines |
| [agent-api.md](agent-api.md) | Machine API keys (`/api/v1`) for Hermes/OpenClaw/automation |
| [api-examples.md](api-examples.md) | Copy-paste request/response examples |
| [troubleshooting.md](troubleshooting.md) | Common self-hosting issues and fixes |
| [FAQ.md](FAQ.md) | Quick answers to common questions |
| [FEATURES.md](FEATURES.md) / [FEATURE-INVENTORY.md](FEATURE-INVENTORY.md) | Roadmap log / implemented-feature inventory |
| [BACKLOG.md](BACKLOG.md) | Known open work |
| [SIMPLIFY.md](SIMPLIFY.md) | Simplification review notes |
| [design/](design/) | UX specs (motion, mode-and-price affordance, UX metrics) |
| [qa/](qa/) | QA runbook reports and sim-user findings |
| [plans/](plans/) | Historical implementation plans (archive) |

## Documented functions

### Backend routes

Dispatched in [`backend/src/server.ts`](../backend/src/server.ts). Full
request/response schemas live in [API.md](API.md).

**Auth** (OIDC + JWT; `POST /api/auth/dev-login` exists only in DEV_MODE)

| Method | Path | Purpose | Docs |
|--------|------|---------|------|
| POST | `/api/auth/dev-login` | DEV_MODE bypass — mints a token pair for the dev user | [API.md](API.md#post-apiauthdev-login) |
| POST | `/api/auth/login` | Starts the OIDC authorization-code + PKCE flow | [API.md](API.md#post-apiauthlogin) |
| GET | `/api/auth/callback` | OIDC redirect endpoint; hands out a one-time ticket (ADR 0003) | [API.md](API.md#get-apiauthcallback) |
| POST | `/api/auth/callback/exchange` | Swaps the one-time ticket for access/refresh JWTs | [API.md](API.md#authentication-flows) |
| GET | `/api/auth/me` | Current user from the bearer token | [API.md](API.md#get-apiauthme) |
| POST | `/api/auth/logout` | Deletes the session | [API.md](API.md#post-apiauthlogout) |
| POST | `/api/auth/refresh` | Rotates the access token from a refresh token | [API.md](API.md#post-apiauthrefresh) |

**Drafts** (JWT; owner-scoped)

| Method | Path | Purpose | Docs |
|--------|------|---------|------|
| GET | `/api/drafts` | List the user's drafts (optional `?state=draft\|ready`) | [API.md](API.md#get-apidrafts) |
| POST | `/api/drafts` | Create a draft | [API.md](API.md#post-apidrafts) |
| GET | `/api/drafts/:id` | Fetch one draft | [API.md](API.md#get-apidraftsid) |
| PUT | `/api/drafts/:id` | Update a draft (partial) | [API.md](API.md#put-apidraftsid) |
| DELETE | `/api/drafts/:id` | Delete a draft | [API.md](API.md#delete-apidraftsid) |
| POST | `/api/drafts/:id/publish` | Validate + send the draft to PostGrid (ADR 0002) | [API.md](API.md#post-apidraftsidpublish) |
| POST | `/api/drafts/:id/schedule` | Schedule the draft for later dispatch | [API.md](API.md#post-apidraftsidschedule) |
| POST | `/api/drafts/:id/cancel-schedule` | Clear a scheduled dispatch time | [API.md](API.md#post-apidraftsidcancel-schedule) |

**Postcards** (JWT — sending costs real money, so this is rate-limited)

| Method | Path | Purpose | Docs |
|--------|------|---------|------|
| POST | `/api/postcards` | Create and send a postcard directly | [API.md](API.md#post-apipostcards) |
| GET | `/api/postcards` | List the user's sent postcards | not yet documented in API.md |

**PostGrid admin** (JWT; mode toggle is admin-only via `ADMIN_EMAILS`)

| Method | Path | Purpose | Docs |
|--------|------|---------|------|
| GET | `/api/postgrid/status` | Effective mode (test/live/mock) + per-country pricing | [API.md](API.md#get-apipostgridstatus) |
| POST | `/api/postgrid/mode` | Toggle test/live at runtime (fails closed without ADMIN_EMAILS) | [API.md](API.md#post-apipostgridmode) |

**System**

| Method | Path | Purpose | Docs |
|--------|------|---------|------|
| GET | `/api/health` | System health and dependency checks | [API.md](API.md#get-apihealth) |
| GET | `/api/test` | Dev-only debug ping (non-production builds) | [API.md](API.md#get-apitest) |

**Agent API** (`/api/v1` — `x-api-key` auth for machines; see [agent-api.md](agent-api.md))

| Method | Path | Purpose | Docs |
|--------|------|---------|------|
| POST | `/api/v1/postcards` | Create and send a postcard from an agent | [agent-api.md](agent-api.md) |
| GET | `/api/v1/postcards` | List sent postcards | [agent-api.md](agent-api.md) |
| GET | `/api/v1/postcards/:id` | Fetch one sent postcard | [agent-api.md](agent-api.md) |

**Webhooks** (email-to-postcard pipeline — **paused**, see AGENTS.md)

| Method | Path | Purpose | Docs |
|--------|------|---------|------|
| POST | `/api/webhook/email` | Process an inbound email into a postcard request | [API.md](API.md#post-apiwebhookemail) |
| GET | `/api/webhook/health` | Webhook pipeline health | [API.md](API.md#get-apiwebhookhealth) |

In production the backend also serves the built frontend (`frontend/dist`)
for every non-`/api` path.

### Frontend routes

Wired in [`frontend/src/main.tsx`](../frontend/src/main.tsx); visual reference
in the [screenshots manifest](screenshots/README.md).

| Route | Page | Purpose | Captures |
|-------|------|---------|----------|
| `/login` | LoginPage | Sign-in (starts OIDC) | `desktop-login`, `mobile-login` |
| `/auth/callback` | AuthCallbackPage | OIDC redirect handler; ticket exchange (ADR 0003) | — |
| `/` | DashboardPage | Dashboard — "Send something real" | `desktop-dashboard`, `mobile-dashboard` |
| `/create` | CreatePage | 5-step postcard wizard (destination, photo, message, address, review) | `desktop-create/photo/message/review`, `mobile-create/photo/message/review` |
| `/drafts/:id` | CreatePage | Resume a saved draft in the same wizard | — |
| `/history` | HistoryPage | Sent-postcard history | `desktop-history`, `mobile-history` |
| `*` | NotFoundPage | 404 catch-all | — |
