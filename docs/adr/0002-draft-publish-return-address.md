# ADR 0002: Draft Publish Requires a Sender Address; Recipient-as-Return Is a Client-Side Materialization

- Status: Accepted — gates implementation of ISSUE-0118
- Date: 2026-11-02
- Deciders: Maintainer, Priya (principal engineer)
- supersedes: none; resolves the main-vs-editor-shell contract divergence created by the nightshift merge (ed99477)

## Context

Two publish contracts shipped and both had tests when the nightshift merge landed:

- **main (PR #92)**: `POST /api/drafts/:id/publish` rejected sender-less drafts — 400, `field: "from"`, `"Return address (from) is required"`, draft left in `draft` state. The merge commit 8554967 removed those two main-origin tests (sender-required, GIF-reject) so the suite matched shipped behavior; the scenario bodies remain recoverable via `git show 8554967`.
- **editor-shell lineage (what ships at ed99477)**: publish validates the sender only `if (draft.senderAddress)` (`backend/src/routes/drafts.ts:197-203`), then passes `from: draft.senderAddress` (`:261`) — `undefined` when absent.

What actually happens to a sender-less publish today (traced at ed99477):

1. `PostGridService.createPostcard` guards the entire return-address block behind `if (request.from)` (`backend/src/services/postgrid.ts:140-151`). With `from` undefined, **no `from[...]` field is sent at all** — Sam's R4 service tests prove both halves: every `from[...]` field transmits when present (`postgrid.test.ts`, "sends every from[...] field alongside to[...]"), and the omission case ("omits from[...] fields when from is undefined but still sends to[...]") is asserted, not prevented.
2. In real (non-mock) mode the result is billable physical mail with no return address. The service's own comment states the consequence: "Return address — without it, undeliverable mail is destroyed instead of returned to the sender" (`postgrid.ts:138-139`). PostGrid's print-mail create-postcard documentation shows `from` (a Contact) in every example; ISSUE-0100 records "PostGrid requires a return address on physical mail". Whether PostGrid hard-rejects or accepts a from-less postcard, both outcomes are contract failures: a 400 after we already accepted the job (confusing, wasted call) or mail that cannot come back if delivery fails.
3. Mock mode (`POSTGRID_MOCK=true`) hides all of this — the mock response never inspects `from`.

Meanwhile the frontend **already implements** the fallback the Address step promises — client-side, explicitly, before anything is validated or shipped:

- `frontend/src/components/wizard/AddressStep.tsx:84-106`: with "Use a different return address" unchecked, `handleSubmit` copies the validated recipient form into the return-address state (`onReturnAddressChange(form)`); copy at `:222` says exactly this.
- `frontend/src/pages/CreatePage.tsx:102-108` (`draftPayload`: `senderAddress: postcard.returnAddress ?? address`), `:191` (autosave), `:240-246` (`handleSend` → direct route), and `:65` (draft-load fallback `draft.senderAddress ?? draft.recipientAddress`) — every wizard path ships a concrete `senderAddress`.
- `frontend/src/components/wizard/ReviewStep.tsx:79-82` shows the effective "From:" to the user before the money moment.

So through the shipped UI, a sender-less draft cannot be produced. The gap is an **API-contract gap**: only direct API clients (and edge paths) can publish a draft without `senderAddress`, and the backend's answer today is silent omission at the PostGrid boundary.

The contract map across all billable entry points at ed99477:

| Entry point | Auth | `from` required? |
|---|---|---|
| `POST /api/postcards` (direct) | JWT | Yes — `postcards.ts:53-54` |
| `POST /api/v1/postcards` (Agent API) | API key | Yes — same `handlePostcardCreate` (`server.ts:471-481`) |
| `POST /api/drafts/:id/publish` | JWT | **No — silently omitted at PostGrid** |
| scheduled dispatcher → `publishDraftById(allowScheduled)` | system | **No — same path** |

Publish is the single leak in an otherwise strict contract. (`docs/API.md` even documents a phantom: draft-create `senderAddress` "optional, may use default" at line 462 — no server-side default exists anywhere.)

## Decision

**Option (c): publish requires `senderAddress`; the recipient-as-return fallback lives in the client and is materialized before submit, so what ships is what was validated.**

1. `publishDraftById` appends `{ field: 'from', message: 'Return address (from) is required' }` when `draft.senderAddress` is absent, before any PostGrid call — byte-identical to the direct route's error (`postcards.ts:54`) for route parity. Restores main's contract (PR #92).
2. The server **never invents an address**. No server-side recipient-as-return fallback, no config default stitched in at publish time.
3. The frontend needs **no behavioral change**: `AddressStep`'s unchecked-checkbox copy and `CreatePage`'s `??` materialization are the sanctioned fallback mechanism, and `ReviewStep` already surfaces the effective "From:" for the trust check. The copy on `AddressStep.tsx:222` is true and stays.

## Options considered

### (a) Require sender (reject), frontend unchanged — effectively merged into (c)

Same server contract as (c). Framed alone it leaves the client-side copy as an undocumented accident and the API docs' phantom "may use default" in place. (c) is (a) plus naming the client-side materialization as the contract's sanctioned fallback and correcting the docs. No separate ship.

### (b) Server-side recipient-as-return fallback — REJECTED

- **Silent default on a billable path.** The publish payload would differ from what the user's draft says. This is the same failure class as `backHTML || 'Thank you!'` (`postgrid.ts:156`, flagged in ISSUE-0100's related notes): the server substituting content nobody validated. The house rule is the opposite — bad payloads fail loudly before the money is spent.
- **Trust cost.** If the card is undeliverable, it returns to the *recipient*: your auntie receives her own card back, addressed from herself, with no sender identity anywhere on it. For fam-mail's product (family sends family), that is the worst possible delivery failure, and it converts a data-entry omission into a confusing physical artifact.
- **Divergent `from` semantics.** The direct route would still require `from` while publish silently rewrites it — two meanings for the same field on the same billable action, which is precisely the leak this decision exists to close.
- **Domain rule friction.** AGENTS.md: "Return address: present and valid (often configured, not free-form per card)" — a fallback, if the product ever wants one, belongs at the account/config level, not stitched from the recipient at publish.

### (b') Account-level configured return address as server fallback — considered, deferred

The AGENTS.md-shaped version of a fallback: an instance-configured sender (env/config) used when the draft omits `senderAddress`. No such config exists today (`config.postgrid.senderId` is a PostGrid sender ID, not an address), so this adds config + validation surface for a gap the UI never produces. Deferred: if Beta feedback shows users dropping off the "different return address" checkbox, revisit as its own ADR with schema/config implications. Until then, absence of a sender is a validation error, not a default.

## Consequences

**Positive:**

- One contract for one billable action: direct, Agent API, publish, and the scheduler all require `from` and fail before PostGrid. The silent-omission hole (`postgrid.ts:140` reachable with `from: undefined` from a route) closes; the R4 omission test stays as a service-level truth, but no route can reach it anymore.
- The scheduler composes for free: `processDueDrafts` already treats 4xx as permanent — unschedules and reverts to `draft` (`backend/src/services/scheduler.ts:71-80`). A scheduled sender-less draft now fails safe instead of mailing from-less.
- Zero UI change, zero copy change, zero migration. Existing sender-less drafts in the DB simply get the 400 and remain editable working objects.
- What prints is auditable: the persisted `senderAddress` is exactly the address that was validated and mailed — no divergence between draft, payload, and PostGrid form body.

**Negative / costs:**

- API clients that today publish sender-less drafts get a new 400. This is a behavior change on paper; in practice the shipped UI never produced that payload, and `docs/API.md`'s "optional, may use default" was documenting behavior that didn't exist. Breaking the phantom is the point.
- Client-side fallback means a malicious/buggy client can still *deliberately* send recipient-as-sender — but it is now a visible, validated, user-owned address in the draft record, not a server fiction. That is the correct trust boundary: the client decides the address, the server enforces its validity.
- Live-mode caveat carried from ISSUE-0100 unchanged: PostGrid docs name the Contact field `country`, code sends `countryCode`; one live-mode sanity send is still owed when real keys exist. This ADR does not alter `from[...]` field names.

## Implementation note (gate for Sam — trace-verified at ed99477)

**Backend — `backend/src/routes/drafts.ts`, `publishDraftById` (lines 197-203):**

Replace:

```ts
// Validate sender address if provided
if (draft.senderAddress) {
  const fromResult = validateAddress(draft.senderAddress, 'from')
  if (!fromResult.valid) {
    allErrors.push(...fromResult.errors)
  }
}
```

with:

```ts
// Validate sender address — required; without it PostGrid receives no
// return address (postgrid.ts skips the whole from[...] block).
if (!draft.senderAddress) {
  allErrors.push({ field: 'from', message: 'Return address (from) is required' })
} else {
  const fromResult = validateAddress(draft.senderAddress, 'from')
  if (!fromResult.valid) {
    allErrors.push(...fromResult.errors)
  }
}
```

The message string must match `postcards.ts:54` exactly. Validation already runs before the PostGrid call (`:225-227` gate before `:267`); no other publish-path change.

**Required tests (backend):**

1. `backend/src/routes/drafts.test.ts` — restore the removed main-origin test from commit 8554967 (`git show 8554967` has the exact body): sender-less draft → 400, `data.error === "Validation failed"`, `data.errors` contains `{ field: 'from', message: 'Return address (from) is required' }`, draft stays in `draft` state. **Add one assertion the removed test lacked:** the mock PostGrid's `createPostcard` was not called (call-count spy) — the fail-before-PostGrid guarantee should be asserted directly, not inferred from state.
2. `backend/src/routes/drafts.test.ts` — sender-less + scheduled: draft in `ready` state with `scheduledFor` set, published via `publishDraftById(id, owner, { allowScheduled: true })` → 400 with the `from` error; then a scheduler-level assertion that `processDueDrafts` unschedules (`scheduledFor: null`) and reverts state to `draft` without calling PostGrid (covers `scheduler.ts:71-80` composition).
3. Existing lineage equivalents must stay green: "should return 400 when senderAddress is invalid" (publish) and the direct-route required/invalid `from` tests in `postcards.test.ts`.
4. `POSTGRID_MOCK=true` for all of the above (agent/CI policy); no live calls.

**Frontend — no change required (verified):**

- `AddressStep.tsx:84-106` copy-on-unchecked, `CreatePage.tsx:102-108` `draftPayload`, `:191` autosave, `:240-246` send, `:65` draft-load fallback, `ReviewStep.tsx:79-82` From display. Existing `AddressStep.test.tsx` ("When no separate return address, recipient address is used as return") already pins the behavior.

**Docs (same PR):**

- `docs/API.md:462` — draft-create `senderAddress`: drop "may use default"; state it is optional to *store* but required to *publish*.
- `docs/API.md:731-739` — publish validation list: "Sender Address (if provided)" → "Sender Address: required — 400 with `field: 'from'` when absent".
- `docs/agent-api.md` — note that draft publish is not exposed on `/api/v1` (server.ts returns 404 for `/api/v1/drafts/*`; agents use `POST /api/v1/postcards`, which already requires `from`).

**Out of scope, same failure class (do not bundle):** `backHTML || 'Thank you!'` silent default (`postgrid.ts:156`) — its own decision per ISSUE-0100's related notes; the image-format strictness question (main GIF-reject vs lineage htmlSanitizer path) remains open in ISSUE-0118.

## References

- ISSUE-0118 (this decision), ISSUE-0100 (from[...] append fix history, R4 tests, live-mode caveat), ISSUE-0084 (original publish-skips-validation bug)
- Commit 8554967 — removed main-origin publish tests; exact test bodies recoverable for restoration
- `backend/src/services/postgrid.ts:138-151` — from[...] append + omission guard; `:138-139` comment on undeliverable-mail destruction
- PostGrid print-mail API, create postcard: docs.postgrid.com — `from` (Contact) in every example; field-name caveat per ISSUE-0100
- ADR 0001 — house format; validation-before-PostGrid and sanitization authorities unchanged by this decision
