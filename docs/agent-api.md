# Agent API (`/api/v1`)

Fam-mail exposes a machine API so agents — [Hermes](https://github.com/NousResearch/hermes-agent), OpenClaw, cron scripts, or your own automation — can create and track real postcards without driving the web UI. Every endpoint is authenticated with a static API key; there are no expiring tokens to rotate.

## Setup

1. Make sure the user the key will act as has logged into fam-mail once (so their user record exists).
2. Generate a key and add it to `.env` (restart required after changes):

   ```bash
   # key:label:email  — comma-separated for multiple keys
   API_KEYS=fam_9f2c1ab8:hermes:me@example.com,fam_77d0e3:openclaw:me@example.com
   ```

3. Keys act **as their mapped user**: postcards they create are owned by that user, appear in their dashboard, and count against the same records.

> Treat keys like passwords — a key can spend real money on physical mail when `POSTGRID_MODE=live`. Prefer `POSTGRID_MODE=test` or `POSTGRID_MOCK=true` while integrating.

## Authentication

Send the key either as a header or a bearer token:

```bash
curl -H "x-api-key: fam_9f2c1ab8" ...
# or
curl -H "Authorization: Bearer fam_9f2c1ab8" ...
```

JWTs from the web UI are **not accepted** on `/api/v1` — a leaked browser token can't be replayed as a machine credential.

The web auth flow changed with ADR 0003 (#86): the OIDC callback now hands the SPA a one-time ticket exchanged via `POST /api/auth/callback/exchange` — tokens no longer travel in redirect URLs. Zero `/api/v1` impact; agents keep using static API keys.

Rate limit: 10 requests/minute per IP (postcard creation is deliberately tight — it costs real money).

## Endpoints

### `POST /api/v1/postcards` — create and send a postcard

Same validation and PostGrid pipeline as the web app. The card is sent immediately.

```bash
curl -X POST http://localhost:8484/api/v1/postcards \
  -H "x-api-key: $FAMMAIL_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": {
      "firstName": "Grace", "lastName": "Hopper",
      "addressLine1": "1 Spectacular Way",
      "city": "New Haven", "provinceOrState": "CT",
      "postalOrZip": "06510", "countryCode": "US"
    },
    "from": {
      "firstName": "Nick", "lastName": "Sender",
      "addressLine1": "2 Return Rd",
      "city": "New Haven", "provinceOrState": "CT",
      "postalOrZip": "06511", "countryCode": "US"
    },
    "message": "Happy birthday, Grace! **See you soon.**",
    "size": "6x4"
  }'
```

**Request fields**

| Field | Required | Notes |
|-------|----------|-------|
| `to` | yes | Inline address: `firstName`, `lastName`, `addressLine1`, optional `addressLine2`, `city`, `provinceOrState` (2-letter), `postalOrZip`, `countryCode` (`US`/`CA`/`GB`) |
| `from` | yes | Return address, same shape. Printed so undeliverable mail comes back to you |
| `message` | one of | Markdown for the back of the card. Supports `**bold**`, `*italic*`, headings, lists, plus `<u>`, `<s>`, `<sub>`, `<sup>`, and `<span style="color:#dc2626">colored text</span>`. Max 5000 chars |
| `frontHTML` | one of | Full custom front artwork HTML (sanitized; safe CSS only) |
| `image` | one of | Base64 JPEG/PNG/WebP ≤ 10 MB; becomes a full-bleed front. A data URI works too |
| `backHTML` | one of | Full custom back artwork HTML |
| `size` | no | `6x4` (default), `9x6`, `11x6` |

At least one of `message`, `frontHTML`, `backHTML`, `image` is required.

**Response** `200`:

```json
{
  "success": true,
  "postcard": { "id": "pc_xxx", "status": "ready", "size": "6x4", "..." : "..." },
  "testMode": true
}
```

**Validation errors** `400` — all problems are reported at once:

```json
{
  "error": "Validation failed",
  "errors": [
    { "field": "to.postalOrZip", "message": "US ZIP code must be 5 digits or 5+4 format (e.g. \"12345\" or \"12345-6789\")" }
  ]
}
```

### `GET /api/v1/postcards?limit=50` — list sent postcards

Newest first, scoped to the key's user.

```json
{ "data": [ { "id": "...", "postgridId": "pc_...", "recipientName": "Grace Hopper", "recipientAddress": "...", "status": "sent", "mode": "test", "createdAt": "..." } ] }
```

### `GET /api/v1/postcards/:id` — get one postcard

Returns the same shape as the list item. `404` if it doesn't exist or belongs to another user.

## Agent cookbook

**Hermes / OpenClaw tool schema (abridged):**

```json
{
  "name": "send_postcard",
  "description": "Mail a physical postcard via self-hosted fam-mail",
  "parameters": {
    "to_firstName": "string", "to_lastName": "string",
    "to_addressLine1": "string", "to_city": "string",
    "to_provinceOrState": "string", "to_postalOrZip": "string",
    "to_countryCode": "US|CA|GB",
    "message": "string (markdown + inline formatting)",
    "size": "6x4|9x6|11x6"
  }
}
```

The agent fills the address book from conversation context, composes the message, and `POST /api/v1/postcards` handles printing and mailing. Check `testMode` in the response — if `true`, nothing physical was sent.

**Birthday reminders with cron:** list contacts in your own tooling, then call the API on the right day. The message pipeline handles markdown, so plain text works fine.

## Error codes

| Status | Meaning |
|--------|---------|
| 400 | Validation failed (see `errors` array) |
| 401 | Missing/invalid API key, or key mapped to a user who has never logged in |
| 404 | Unknown postcard id or route |
| 429 | Rate limited (10/min) |
| 500 | PostGrid not configured or upstream failure — nothing was mailed |
| 502+ | PostGrid upstream error passed through |


## Drafts are not exposed on /api/v1

Draft endpoints (`POST /api/drafts`, `POST /api/drafts/:id/publish`, etc.) are JWT-only and are deliberately **not** mirrored under `/api/v1` — the Agent API covers direct sends only via `POST /api/v1/postcards`, which already requires a sender address (`from`). Agents that need drafts should manage state client-side and submit with `from` included (ADR 0002: publish requires a sender address; scheduled dispatch fails safe on drafts without one).
