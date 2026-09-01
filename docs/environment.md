# Environment Variable Reference

Single source of truth is `backend/src/config/index.ts`. Copy `.env.example`
and adjust. All variables are read at startup — restart after changes.

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `DEV_MODE` | `false` | no | Bypass OIDC; one-click dev login. Local development only. |
| `POSTGRID_MODE` | `test` | no | `test` or `live` — selects which API key is used. |
| `POSTGRID_TEST_API_KEY` | `—` | yes* | Test-mode key. *Not required when POSTGRID_MOCK=true. |
| `POSTGRID_LIVE_API_KEY` | `—` | yes* | Live-mode key. *Not required when POSTGRID_MOCK=true. |
| `POSTGRID_FORCE_TEST_MODE` | `false` | no | Force the test key even in live mode. |
| `POSTGRID_MOCK` | `false` | no | Simulate PostGrid locally: no network, keys optional. |
| `POSTGRID_WEBHOOK_SECRET` | `—` | no | Shared secret for `/api/webhook/email` (fails closed if unset). |
| `POSTCARD_SIZE` | `6x4` | no | Default card size: 6x4, 9x6, or 11x6. |
| `POSTCARD_SENDER_ID` | `—` | no | Optional PostGrid sender/contact ID. |
| `API_KEYS` | `—` | no | Agent API keys: `key:label:email` entries, comma-separated. |
| `OIDC_ISSUER_URL` | `—` | yes† | OIDC provider discovery URL. †Not required in DEV_MODE. |
| `OIDC_CLIENT_ID` | `—` | yes† | OIDC client id. |
| `OIDC_CLIENT_SECRET` | `—` | yes† | OIDC client secret. |
| `OIDC_REDIRECT_URI` | `—` | yes† | e.g. `http://localhost:8484/api/auth/callback`. |
| `OIDC_SCOPES` | `openid profile email` | no | Space-separated scopes. |
| `JWT_SECRET` | `—` | yes‡ | ≥32 chars. ‡Dev default in DEV_MODE. Rotate to revoke sessions. |
| `JWT_EXPIRES_IN` | `7d` | no | Access token lifetime. |
| `JWT_REFRESH_EXPIRES_IN` | `30d` | no | Refresh token lifetime. |
| `ADMIN_EMAILS` | `—` | recommended | Comma-separated admin emails; required for test↔live switching. |
| `DATABASE_PATH` | `/data/fammail.db` | no | SQLite file path. |
| `PORT` | `8484` | no | HTTP port (also serves the built frontend). |
| `NODE_ENV` | `development` | no | `production` serves `frontend/dist` from the same port. |
| `LOG_LEVEL` | `info` | no | debug | info | warn | error. |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | no | CORS origins, comma-separated. |
| `SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD / EMAIL_FROM` | `localhost / 587 / — / — / noreply@fammail.com` | no | Email notifications (optional). |
| `IMAP_HOST (+ IMAP_*, LLM_*)` | `—` | no | Paused email-to-postcard pipeline; only read when IMAP_HOST is set. |

## Minimal setups

**Local tour (no accounts, no mailing):**
`DEV_MODE=true POSTGRID_MOCK=true` (+ PORT, DATABASE_PATH).

**Production with real mailing:**
PostGrid keys, OIDC settings, `JWT_SECRET`, `ADMIN_EMAILS`, `DATABASE_PATH`,
`PORT`, `NODE_ENV=production`, `ALLOWED_ORIGINS`.
