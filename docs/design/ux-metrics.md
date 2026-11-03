# UX Metrics — Modern Sleek Desktop & Native-Feeling Mobile

Nightshift 2026-11-02 → 2026-11-03. Each metric has a **baseline** (measured at the start of the
night, see `frontend/tests/e2e/ux-audit.spec.ts` + `qa-screenshots/nightshift-baseline-*.png`) and a
**target**. Rounds move metrics toward target; the audit spec re-measures after every round so
regressions are caught before merge.

## How we measure

- `cd frontend && E2E_BASE_URL=http://localhost:5176 npx playwright test ux-audit` → writes `tests/e2e/ux-audit-results.json` (git-ignored).
- Manual Playwright-MCP walkthrough (orchestrator) before every merge: real clicking on desktop 1280×800 and mobile 390×844.
- Bundle: `pnpm build` + `dist` size report.

## Desktop — "modern, sleek, animated"

| # | Metric | Baseline (2026-11-03 02:10) | Target |
|---|--------|------------------|--------|
| D1 | Console errors/warnings during full wizard walkthrough | 0 errors / 0 warnings ✅ | 0 (hold) |
| D2 | Page-to-page transitions (route changes animated, 150–300 ms, transform/opacity only) | 0 of 5 routes animated | 5 of 5 |
| D3 | Wizard step-change animation (slide/fade between steps, direction-aware) | none | direction-aware slide ≤ 300 ms |
| D4 | PostcardPreview flip | **exists: framer rotateY @ 600 ms** (baseline correction by June — spec review) | trim to ≤ 400 ms, keyboard `f` shortcut, reduced-motion → 150 ms crossfade |
| D5 | Dashboard entry: staggered card/hero reveal | none | stagger ≤ 90 ms/item, total ≤ 600 ms |
| D6 | Async surfaces show skeletons, never full-page spinners | drafts: text-only empty state | skeletons on dashboard, history, preview |
| D7 | Interactive elements with hover + active + focus-visible states | partial (links only) | 100% of buttons/cards/inputs |
| D8 | Micro-interactions on dialogs/toasts/buttons (100–200 ms enter/exit) | toasts default; dialogs radix-default | consistent scale/fade tokens app-wide |
| D9 | Main JS chunk (gzip) | **47.14 kB / 14.12 kB gzip; framer-motion lazy chunk 122.87 kB / 40.12 gzip; first-load ≈ 133 kB gzip** (Marcus, 02:40) | hold ≤ 300 KB; keep heavy chunks lazy |
| D10 | Hardcoded hex colors in components (non-theme) | 7 hits, all the user-facing message text-color palette in `InlineMessageEditor.tsx` (legitimate content colors) + 1 `bg-[#fffef8]` `PostcardPreview.tsx:230` (real offender, Marcus F12) | 0 theme violations (content palette exempt) |

## Mobile — "animated, native-feeling"

| # | Metric | Baseline | Target |
|---|--------|----------|--------|
| M1 | Horizontal overflow at 320/360/390 px on dashboard + every wizard step | **app-shell-wide: fixed ~407px nav cluster overflows every page (+29px @375, +87px @320 — Marcus ISSUE-0107); Review adds +16px @390** ❌ | 0 px on all pages × 3 widths |
| M2 | Touch targets ≥ 44×44 px | **17 undersized** (Flip 39×16, step dots 32×32, nav 32 h) ❌ | 0 undersized |
| M3 | Inputs ≥ 16 px (no iOS focus zoom) + `inputmode`/`autocomplete` on address fields | **1 input @ 14 px; 0 inputmode attrs** ❌ | 0 undersized; inputmode on ZIP/phone |
| M4 | Bottom tab bar (thumb-reach nav) on < md viewports with animated active indicator | none — top nav only | bottom bar w/ active morph ≤ 200 ms |
| M5 | Wizard primary action fixed in thumb zone (safe-area padded, animated press) | in-flow buttons | sticky bottom bar, safe-area inset |
| M6 | Sheets/dialogs slide up from bottom edge with spring feel on mobile | centered fade (radix default) | slide-up ≤ 300 ms, backdrop fade |
| M7 | `prefers-reduced-motion` degrades ALL animations to opacity-only ≤ 1 frame | **partial**: framer honors it via MotionConfig; zero `prefers-reduced-motion` CSS anywhere in src — raw CSS transitions don't reduce (PM grep) | verified via emulated audit |
| M8 | Scroll: no rubber-band leaks, sticky header elevation on scroll | unverified | implemented |
| M9 | Tap highlight/selection: `-webkit-tap-highlight-color` transparent, `touch-action` set on gestures | unverified | implemented |

## Process gates (every round, non-negotiable)

1. `cd frontend && npx vitest run && pnpm lint` green; `pnpm build` green when types/bundle touched.
2. `E2E_BASE_URL=http://localhost:5176 npx playwright test` green (postcard-flow, responsive, ux-audit).
3. Orchestrator browser walkthrough passes with **no regression** vs the previous round's screenshots.
4. `prefers-reduced-motion` audit stays green after any new animation.

## Round plan (iterating toward the targets)

- **R1 — Shell & motion foundations:** motion tokens in tailwind config; route transitions (D2); dashboard stagger (D5); fix M1 overflow, M2 touch targets (worst offenders), M3 input zoom.
- **R2 — Preview & wizard:** 3D flip (D4), step transitions (D3), skeletons (D6).
- **R3 — Mobile native feel:** bottom tab bar (M4), sticky action bar (M5), sheet pattern (M6).
- **R4 — Micro-interactions & consistency:** D7, D8, M8, M9; hardcoded-color sweep (D10).
- **R5 — Performance:** bundle budget (D9), code-split editor, image lazy-load.
- Continuous: QA persona pass per round files `.issues/`; next round's implementation burns them P0-first.
