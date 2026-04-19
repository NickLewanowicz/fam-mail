---
paths:
  - "backend/**/*.ts"
---

# Backend rules — fam-mail

## Runtime and style

- **Bun** executes the server and tests; TypeScript is **strict**—avoid `any`.
- HTTP handling is **manual** (router-style dispatch in `server.ts` and route modules)—follow existing patterns for status codes, JSON bodies, and errors.

## Data and config

- **SQLite** path from `DATABASE_PATH`; keep migrations and schema changes deliberate and tested.
- **`getConfig()` / env parsing** (`backend/src/config/index.ts`) — remember **IMAP-related variables** may still be required even when IMAP features are paused; do not break dev startup for minimal `.env` sets without addressing config shape.

## PostGrid

- Service client: `backend/src/services/postgrid.ts`; postcard routes: `backend/src/routes/postcards.ts`.
- Treat every outbound postcard as **billable physical mail**—validate payloads and errors before calling the API.
- Default agent/local runs to **`POSTGRID_MOCK=true`** unless explicitly testing live PostGrid.

## Auth

- **OIDC** and **JWT** session flows live under `backend/src/routes/auth.ts` and related middleware—coordinate with any frontend callback routes before changing redirect URLs.

## Webhooks

- PostGrid webhooks (if enabled) should remain **idempotent** and **signature-aware** per existing helpers—extend tests when adding branches.
