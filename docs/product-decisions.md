# Product decisions log

Lightweight record of maintainer product decisions that don't warrant ADRs. Newest first.
Source: decision board 2026-11-04 (selections + notes, maintainer-confirmed).

## 2026-11-04 — Decision board round 1

### D1 · Photo dimensions: warn, don't reject
Publish accepts photos below the 300-DPI minimum (1875×1275 for 6×4). The UI warns at upload/review
("may print soft at this resolution") instead of rejecting. Revisit rejection after Beta feedback.
Owner: frontend; no backend gate.

### D2 · No silent back content
Publish (draft + direct routes) rejects with 400 when both `backHTML` and `message` are empty —
every card carries intentional words. The service-level `backHTML || 'Thank you!'` fallback is
removed; routes gate before PostGrid per ADR 0002's house rule.

### D3 · Real, country-aware pricing (sourced from the PostGrid dashboard, Starter tier)
First-class/Lettermail per-piece rates become the defaults (env-overridable):

| Size | US First Class | CA Lettermail | GB |
|------|----------------|---------------|----|
| 4×6 (6×4) | $0.902 | $2.12 | unpriced (null) |
| 6×9 (9×6) | $1.023 | $2.22 | unpriced |
| 6×11 (11×6) | $1.289 | $2.97 | unpriced |

Schema becomes country-aware (`POSTGRID_PRICE_<COUNTRY>_<SIZE>`; status payload `pricing` keyed by
country). GB rates not published ("Talk to sales") → null → the truth line honestly omits price for
GB recipients. Standard-class estimates can be added later; the "about …" qualifier stays.

### D4 · Sessions: keep multi-device for Beta
New logins do not revoke older sessions; 7-day expiry + per-device logout are the controls.
Revisit when real accounts land.

### D5 · Ticket store ceiling: SQLite, never Redis
Fam-mail is self-hosted for individuals — scale is not a concern. The in-memory 60s ticket store
(ADR 0003) is accepted as-is; if it ever needs to persist or scale, SQLite is the maximum step.
Redis is explicitly out of scope for this product.

### D6 · Mobile screenshot set: expand capture spec (#79)
Capture the full mobile flow (create/wizard, review, history) into `docs/screenshots/mobile-*.png`
alongside the desktop set.
