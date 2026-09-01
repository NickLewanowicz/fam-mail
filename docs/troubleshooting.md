# Troubleshooting

Common issues when self-hosting Fam Mail. If your problem isn't here, check
[Deployment](DEPLOYMENT.md) or open an issue.

## Startup failures

**`getConfig()` throws: "JWT_SECRET must be at least 32 characters"**
Generate a proper secret: `openssl rand -base64 48`. The dev-mode default only
applies when `DEV_MODE=true`.

**"OIDC_ISSUER_URL is required"**
OIDC env vars are required unless `DEV_MODE=true`. For a quick local tour set
`DEV_MODE=true` — sign-in is replaced by a one-click dev login.

**IMAP variables required at startup**
You likely have `IMAP_HOST` set but not `IMAP_USER`/`IMAP_PASSWORD`. The email
pipeline is optional — unset `IMAP_HOST` entirely to run without it.

## Postcards & PostGrid

**The badge says MOCK and I can't switch modes**
`POSTGRID_MOCK=true` disables mode switching by design: nothing is mailed and
no real API key is needed. Set it to `false` (and provide
`POSTGRID_TEST_API_KEY` / `POSTGRID_LIVE_API_KEY`) to leave simulation.

**"Forbidden: admin access required. Configure ADMIN_EMAILS…"**
Mode switching (test ↔ live) is admin-only and fails closed when
`ADMIN_EMAILS` is unset. Add your account email (lowercase, comma-separated)
and restart.

**Postcards never send even though the UI says "sent"**
Check the response's `testMode` flag — test mode prints nothing physical.
Also confirm `POSTGRID_MODE` and which key (`test_` vs `live_`) you intend to
use.

**Scheduled postcards didn't fire**
The dispatcher runs inside the server process — it needs the container running
when the schedule passes (it checks every 30 s, retrying failures after 15
minutes). Scheduled drafts appear in **Your Drafts** with state `ready`.

## Agent API

**401 "API key … is mapped to unknown user"**
Keys act as an existing user. That user must sign in to the web UI at least
once before the key works.

**401 "Invalid API key"**
`API_KEYS` entries are `key:label:email` (label optional), comma-separated.
The server reads this at startup — restart after changing `.env`.

## Appearance

**Dark inputs / invisible labels in the address form**
Fixed — the app now pins `data-theme="fammail"`. If you still see dark
form controls, hard-refresh (Ctrl+Shift+R) to bust cached CSS.

**Login page doesn't navigate after signing in (dev mode)**
A stale token in `localStorage` can leave the SPA on `/login`. Reload the page
once; you'll land on the dashboard.

## Data

**Where is my data?**
SQLite at `DATABASE_PATH` (default `/data/fammail.db` in Docker). Back it up
with any SQLite-safe method; see `scripts/backup.sh` (if present) or
`DEPLOYMENT.md`.
