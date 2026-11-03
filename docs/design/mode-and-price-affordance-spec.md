# Mode & Price Affordance — the truth above Send (ISSUE-0117)

June (UX design), 2026-11-03. Fixes Rose's F1/F2 (`docs/qa/sim/rose-2026-11-03.md`). Stack per ADR 0001; **no new dependencies**; reuses motion tokens from `docs/design/motion-and-polish-spec.md` (`T.standard`). One Sam round.

## Problem

Between login and Send there is no mode proof on phones: `PostGridModeBadge` is `hidden sm:flex` in `AppShell.tsx:133` (R1 overflow fix), the wizard is the editor variant, and `ReviewStep.tsx:62-76` carries mode banners at the *top* of the panel — away from the sticky Send at the bottom. Nothing states cost anywhere. Rose stopped with her hand on Send.

## Research notes

- **Stripe** shows a persistent test-mode ribbon on every dashboard page and the total immediately above the pay button — mode and money ride the money surface, not the nav. (stripe.com/docs/test-mode)
- **TouchNote / Ink Cards**: the send CTA itself carries price ("Send for $1.99") — cost is legible at the thumb, no separate pricing page. (touchnote.com, inkcards.com)
- **Apple HIG confirmations**: before a consequential action, state outcome + recipient + cost in one plain sentence; use text, not color alone. (developer.apple.com/design/human-interface-guidelines/confirmations)

**What we do differently:** our Send sits in a fixed mobile bar, so the truth must live *in the bar* — an in-panel banner alone re-creates Rose's gap the moment content scrolls.

**320px arithmetic (drives Decision 1):** bar = `px-4`(32) + Back ≈81 + gap 8 + chip ≈42 + primary "Write Message →" ≈156 = **319px ≥ 288px available**. A chip squeezed beside Back overflows at 320 on steps 1–3. The chip therefore gets its own row.

## Decision 1 — WizardActionBar gains a truth row (chip lives there)

`WizardActionBar.tsx`: bar becomes two rows. Top row (all steps 1–4): on steps 1–3 the mode chip; on step 4 the truth sentence + chip trailing. Bottom row: existing Back/primary, untouched (`h-16` geometry, `press`, spinner, `data-testid`s preserved).

```tsx
<div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-surface/90 backdrop-blur border-t border-ink-line/60">
  {/* truth row — h-7, 320px-safe: full-width row, nothing competes for width */}
  <div className="flex items-center gap-2 px-4 h-7 border-b border-ink-line/40" >
    <span className={`shrink-0 inline-flex items-center h-5 px-1.5 rounded border text-[10px] font-semibold tracking-wide ${chipCls[mode ?? 'mock']}`} role="status">
      {mode?.toUpperCase() ?? '—'}<span className="sr-only">{' mode' + SR_ONLY[mode ?? 'mock']}</span>
    </span>
    {step === 4 && <p id="send-truth-bar" className="min-w-0 text-xs leading-tight truncate-none text-amber-300">{truth}</p>}
  </div>
  {/* existing h-16 action row unchanged */}
</div>
```

`chipCls` (editor theme, AA on `ink-surface`): test `bg-amber-500/15 text-amber-300 border-amber-500/30`; live `bg-red-500/15 text-red-300 border-red-500/30`; mock/null `bg-white/10 text-warm-text2 border-white/20`. Chip is a **non-interactive `<span>`** — mode toggling stays in the header badge + `ConfirmDialog`; a thumb-reachable toggle is an accident waiting to mail a card. Step 0 (country) stays bar-less: accepted, nothing is sendable there; note the default-variant dashboard/history phone gap as a PM follow-up, out of scope. CreatePage content padding becomes `pb-[calc(8rem+env(safe-area-inset-bottom,0px))] md:pb-10` (bar grew ~28px; iOS safe area must not swallow the size picker).

Mode state lifts to `CreatePage` (one `fetchPostgridStatus` effect, same shape as `ReviewStep.tsx:39-50` today); `ReviewStep` and `WizardActionBar` receive `mode` as a prop — no duplicate fetches. Known limitation: the header badge (sm+) can change mode mid-draft without `CreatePage` refetching; acceptable, toggling is a settings-scale act.

## Decision 2 — the truth line (one sentence, everywhere Send lives)

Single source in the pricing util (Decision 3); rendered twice, one per breakpoint:

- **Bar strip** (mobile, step 4, `md:hidden`): `<p id="send-truth-bar" role="status" aria-live="polite">` — polite announce fires on step-4 mount, i.e. on step change onto Review.
- **In-panel** (`ReviewStep`, `max-md:hidden`, `role="status"`): sits directly above the send cluster in the `pt-2 space-y-2` block (replaces the three banners at `ReviewStep.tsx:62-76` — delete them; they failed Rose by position). `id="send-truth-panel"`, same classes as today's banners: test/mock `bg-amber-50 border-amber-200 text-amber-700`, live `bg-red-50 border-red-200 text-red-700`, null-mode `bg-zinc-50 border-zinc-200 text-zinc-500`, all `px-3 py-2 rounded-md text-sm`.

Copy (exact, `truthCopy(mode, firstName, size)`):
- live: `This mails a real card to ${firstName || 'your recipient'} for ${PRICE_ESTIMATES[size]}.`
- test/mock: `Practice send — nothing will be mailed.`
- null: `Mode unavailable — check your connection before sending.` (fail closed: no false promise either way)

Both Send buttons (bar primary and panel button) gain `aria-describedby="send-truth-bar"` / `"send-truth-panel"` — focusing Send reads the truth. Motion: bar truth row fades in with framer `initial={{opacity:0}} animate={{opacity:1}} transition={T.standard}` (200 ms, opacity only); `MotionConfig reducedMotion="user"` already degrades it to instant. **No height animation** — the row is permanent, so nothing reflows at step change. Panel line: no motion at all.

## Decision 3 — price: static estimates, sentence-riding, never a checkout

New `frontend/src/utils/postcardPricing.ts`:

```ts
import type { PostcardSize } from './postcardTemplate'
// PLACEHOLDER values — Priya owns final pricing (backend/PostGrid lookup); out of scope here (ISSUE-0117 note).
export const PRICE_ESTIMATES: Record<PostcardSize, string> = {
  '6x4': 'about $1.11', '9x6': 'about $1.86', '11x6': 'about $2.24',
}
export const PRICE_QUALIFIER = 'Estimates only — the final cost is set when the card is sent.'
export function truthCopy(mode: PostgridApiMode | null, firstName: string | undefined, size: PostcardSize): string { /* Decision 2 */ }
```

Renders: (a) inside each size button as a second line — buttons become `flex flex-col items-center justify-center leading-tight` (`h-11` holds it; line 1 `6×4"`, line 2 `about $1.11` at `text-[11px] text-current opacity-80` — fits the ~90px flex-1 cell at 320); (b) in the live truth sentence; (c) `PRICE_QUALIFIER` as `text-xs text-zinc-500 mt-1` beside the existing Standard/Large hint. **Not-a-checkout rules:** price is always inside a sentence or size label, `font-normal`, no total row, no cart/receipt semantics, never bolded standalone; grep gate: no `Total`, `Pay`, `Checkout` strings added.

## Edge cases

- **Long recipient names**: truth sentence wraps (`truncate-none` is deliberate on the strip; panel `text-sm` wraps) — the price may never be ellipsized.
- **Mode fetch fails**: chip `—` + zinc styling, null truth line; Send stays gated by `isComplete`.
- **500-char message**: no interaction (checklist shows char count; truth line carries no message content).
- **No photo chosen**: strip shows chip only on steps 1–3; truth row still renders (chip is unconditional on steps 1–4).
- **Editor theme**: chip/truth use `warm-*`/300-level colors (amber-300 ≈ 9:1, red-300 ≈ 7:1 on ink-surface); panel banners keep shipped 50/200/700 AA pairs.
- **320px**: truth row is full-width; button row untouched (already proven); no new horizontal overflow surface.

## Acceptance checks (→ `frontend/tests/e2e/responsive.spec.ts`, `ux-audit.spec.ts`, new Vitest for `truthCopy`)

1. 320 and 390 px: chip visible with text TEST/LIVE on wizard steps 1–4; `document.body.scrollWidth <= innerWidth` on all five steps (no overflow regression).
2. Step 4 at 390 px: `#send-truth-bar` visible and contains `nothing will be mailed` (test mode) or firstName + `about $` (live); at md the panel shows `#send-truth-panel` above Send and the old top banners are gone.
3. Size buttons each render their `PRICE_ESTIMATES[size]` line; `PRICE_QUALIFIER` present; page source contains no `Total`/`Pay`/`Checkout`.
4. Both send buttons expose `aria-describedby`; truth lines are `role="status"`; chip contains the sr-only mode expansion; reduced-motion emulated run shows the truth row opacity-only (no transform).
5. `truthCopy` Vitest: all three modes × three sizes; empty/long firstName (60 chars) wraps not truncates; null mode returns the fail-closed sentence.
