# API Usage Examples

Every route lives in `docs/API.md`; this page shows copy-paste flows. For
machine integrations (no browser, no OIDC), prefer the
[Agent API](agent-api.md) with `API_KEYS`.

## Dev-mode quick tour

```bash
# Start with DEV_MODE=true, then mint a token:
TOKEN=$(curl -s -X POST http://localhost:8484/api/auth/login | jq -r .accessToken)

curl -s http://localhost:8484/api/auth/me -H "Authorization: Bearer $TOKEN"
```

## Draft → publish flow (web UI parity)

```bash
AUTH="Authorization: Bearer $TOKEN"
BASE=http://localhost:8484/api

# 1. Create a draft
DRAFT=$(curl -s -X POST $BASE/drafts -H "$AUTH" -H "Content-Type: application/json" -d '{
  "recipientAddress": {"firstName":"Grace","lastName":"Hopper","addressLine1":"1 Way","city":"New Haven","provinceOrState":"CT","postalOrZip":"06510","countryCode":"US"},
  "message": "Happy birthday!",
  "size": "6x4"
}')
ID=$(echo "$DRAFT" | jq -r .draft.id)

# 2. Publish it (PostGrid test key ⇒ no real mail)
curl -s -X POST $BASE/drafts/$ID/publish -H "$AUTH"

# 3. Schedule it instead (mails automatically when the date passes)
curl -s -X POST $BASE/drafts/$ID/schedule -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"scheduledFor":"2026-12-01T09:00:00Z"}'
```

## Health & status

```bash
curl -s http://localhost:8484/api/health | jq '{status, version, dependencies}'
```

## Agent API (API key, no browser)

```bash
curl -X POST http://localhost:8484/api/v1/postcards -H "x-api-key: fam_…" \
  -H "Content-Type: application/json" -d '{"to":{…},"from":{…},"message":"Hi!","size":"6x4"}'
curl http://localhost:8484/api/v1/postcards -H "x-api-key: fam_…"
```
