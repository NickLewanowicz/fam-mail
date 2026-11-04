# ADR 0004: Postcard Pricing Comes From Config, Carried on the PostGrid Status Endpoint

- Status: Accepted — closes the ISSUE-0117 follow-up (placeholder prices in `postcardPricing.ts`)
- Date: 2026-11-03
- Deciders: Maintainer, Priya (principal engineer)
- supersedes: none

## Context

ISSUE-0117 shipped June's truth line — "This mails a real card to Eleanor for about $1.11" — with values flagged as PLACEHOLDER for this decision (`frontend/src/utils/postcardPricing.ts:5-9`: `about $1.11 / $1.86 / $2.24`; spec: `docs/design/mode-and-price-affordance-spec.md`, Decisions 2–3). The number describes a real cost set by a third party (PostGrid, per size, per account plan); the frontend has no way to know it and nothing to negotiate with.

Existing plumbing (traced at 1e89725):

- `GET /api/postgrid/status` exists (`server.ts:495-497`, JWT-required) and returns `postgrid.getStatusPayload()` = `{ mode, mockMode }` (`postgrid.ts:82-89`).
- The frontend **already polls it**: `fetchPostgridStatus` (`postgridApi.ts:12-20`) is called by `PostGridModeBadge` and the wizard mode chip — the same surfaces the truth line lives on. `truthCopy` already keys off this payload's `mode` to decide whether any price is shown at all (test/mock: "Practice send — nothing will be mailed." — no price; live: the price sentence).

## Decision

**(a) Env-config-driven static table, carried on `/api/postgrid/status`.**

1. **Config keys:** `POSTGRID_PRICE_6X4`, `POSTGRID_PRICE_9X6`, `POSTGRID_PRICE_11X6` — optional decimal-dollar strings (e.g. `"1.11"`). Defaults are the current placeholder values, so no `.env` breaks and `getConfig()` never requires them (AGENTS.md gotcha #1). Values are validated with a strict decimal pattern at startup; garbage throws loudly, per house config style (`getEnvInt` precedent, `config/index.ts`). Live in `config.postgrid.pricing` as `Record<'6x4'|'9x6'|'11x6', string>`.
2. **Transport:** `getStatusPayload()` gains a `pricing` field — `{ mode, mockMode, pricing }`. Raw dollar strings, no currency symbols or "about" — formatting and hedging language stay in the frontend (`truthCopy` composes sentences; the backend ships numbers). Returned in mock mode too: harmless, and the truth line shows no price for test/mock anyway. The route handler (`server.ts:495-497`) needs no code change — it already returns whatever the payload is.
3. **Frontend:** `postcardPricing.ts` keeps `PRICE_ESTIMATES` as the compiled **fallback** (backend older than frontend, or status fetch failed — the fail-closed behavior ISSUE-0117 shipped stays intact) and overrides from `pricing` when the status payload carries it. `truthCopy`'s signature and the not-a-checkout rules are unchanged. `PRICE_QUALIFIER` ("Estimates only — the final cost is set when the card is sent.") stays **unconditional**: even a Maintainer-configured value is an estimate until PostGrid returns the actual — the qualifier is the clause that keeps the copy honest when prices drift.

**Options killed:**

- **(b) Live PostGrid pricing fetch — no such API exists.** PostGrid's print-mail API (docs.postgrid.com; verified against our own client `postgrid.ts`) exposes postcards/letters/checks resources — there is no pricing endpoint. Pricing is published on their marketing site, per plan and region. Nothing to fetch; option dead on arrival, recorded here so it isn't re-proposed.
- **(c) Hardcoded frontend constants (status quo) — rejected.** The truth line's one job is truth about money we don't set. A compile-time constant drifts silently and the copy starts lying; the only drift fix is a frontend redeploy instead of an env change at deploy time.

**Why (a):** beta truthfulness ("about $X" must be roughly right) is preserved by defaults and becomes *owned* — when PostGrid pricing is confirmed or changes, the Maintainer corrects three env vars at deploy, no code. Zero new endpoints: the price rides the payload the app already polls on the same surfaces, so there is no new fetcher, no waterfall, no loading state beyond what exists.

## Implementation note (gate for Sam)

- `backend/src/config/index.ts`: three optional `getEnv` strings + decimal validation into `config.postgrid.pricing`; thread through the `PostGridService` constructor (`server.ts` already passes `config.postgrid.*`, `:95-105`).
- `backend/src/services/postgrid.ts`: `getStatusPayload()` returns `{ mode, mockMode, pricing }` (`:82-89`).
- `frontend/src/utils/postgridApi.ts`: extend `PostgridStatusResponse` with `pricing`.
- `docs/API.md`: update the `/api/postgrid/status` response example.

**Required tests:**

1. Backend: status payload includes default pricing when the env vars are unset; configured values override; an invalid `POSTGRID_PRICE_9X6` throws at `getConfig()` (fail-loud).
2. Frontend (`postcardPricing.test.ts`): live mode renders the configured price; payload without `pricing` falls back to the compiled constants; `PRICE_QUALIFIER` present in both; the grep gate (no `Total`/`Pay`/`Checkout` strings) stays green.
3. Update `PostGridModeBadge.test.tsx` mocks for the new payload field.

## References

- ISSUE-0117 (closed; the placeholder caveat is quoted in its closure note), `docs/design/mode-and-price-affordance-spec.md` Decision 3
- `postgrid.ts:82-89`, `server.ts:495-497`, `postgridApi.ts:12-20`, `postcardPricing.ts`
- ADR 0001 — house format

---

## Amendment — country-aware schema, sourced defaults (2026-11-04)

Amended by the maintainer's decision-board round (D3, `docs/product-decisions.md`): pricing
becomes **country-aware** and the placeholder defaults are replaced with **sourced** PostGrid
dashboard rates (Starter tier, first-class/Lettermail per-piece).

- **Config keys:** `POSTGRID_PRICE_<US|CA|GB>_<6X4|9X6|11X6>`. Sourced defaults — US $0.902 /
  $1.023 / $1.289; CA $2.12 / $2.22 / $2.97; GB keys default to empty (rates not published,
  "Talk to sales") and surface as `null`. Empty/whitespace/negative/NaN values surface as
  `null` per country+size (parse lives in `PostGridService.getStatusPayload`, not at config
  load — config carries raw decimal strings). The original flat `POSTGRID_PRICE_6X4`-style
  keys are removed.
- **Status payload:** `pricing` is keyed by destination country —
  `{ US: {'6x4': number|null, '9x6': …, '11x6': …}, CA: {…}, GB: {…} }`. The backend wiring
  gap from the original implementation (server.ts never passed the price fields into the
  service, so the live payload was always all-null) is closed in the same change.
- **Frontend:** `truthCopy` keeps its signature; callers resolve the recipient's country
  (`priceFor(pricing, countryCode, size)`) and pass the price. Null price → the sentence
  omits the price clause (qualifier stays unconditional, per the original decision). GB
  recipients therefore see an honest price-less truth line and no size-button estimates.
  Standard-class estimates remain out of scope; the "about …" qualifier stays.
