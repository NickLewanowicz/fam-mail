# Upgrading Fam Mail

Fam-mail stores everything in one SQLite database. Upgrades are:
backup → pull → restart. Data migrations are applied automatically at startup
by `backend/src/database/schema.sql`.

## Docker Compose (recommended)

```bash
# 1. Back up first — always
./scripts/backup.sh /data/fammail.db

# 2. Pull and restart
docker compose pull
docker compose up -d

# 3. Verify
curl -s http://localhost:8484/api/health | jq
# expect: {"status":"healthy", ...}
```

## From source

```bash
git pull
pnpm install --frozen-lockfile
pnpm build
# restart your process manager / systemd unit
```

## Between versions

- **1.0.x → 1.1.x:** no manual steps. The drafts table gains scheduled-send
  support automatically. Agent API keys are read from `API_KEYS` in `.env` —
  see `docs/agent-api.md` if you want machine integrations.

## Rollback

```bash
git checkout v1.0.0   # or: docker compose down && use previous image tag
# restore the database if needed:
sqlite3 /data/fammail.db ".restore backups/fammail-<stamp>.db"
docker compose up -d
```

## Version pinning

`latest` moves. Pin a version in `docker-compose.yml` for predictable
upgrades:

```yaml
image: ghcr.io/nicklewanowicz/fam-mail:v1.1.0   # if using the registry
# or build: . with a checkout of a release tag
```
