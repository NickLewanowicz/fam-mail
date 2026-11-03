# UX Metrics — Modern Sleek Desktop & Native-Feeling Mobile

Nightshift 2026-11-02 → 2026-11-03. Each metric has a **baseline** (measured at the start of the
night, see `frontend/tests/e2e/ux-audit.spec.ts` + `qa-screenshots/nightshift-baseline-*.png`) and a
**target**. Rounds move metrics toward target; the audit spec re-measures after every round so
regressions are caught before merge.

## How we measure

- `cd frontend && E2E_BASE_URL=http://localhost:5175 npx playwright test ux-audit` → writes `tests/e2e/ux-audit-results.json` (git-ignored).
- Manual Playwright-MCP walkthrough (orchestrator) before every merge: real clicking on desktop 1280×800 and mobile 390×844.
- Bundle: `pnpm build` + `dist` size report.

## Desktop — "modern, sleek, animated"

| # | Metric | Baseline (2026-11-03 02:10) | Target |
|---|--------|------------------|--------|
| D1 | Console errors/warnings during full wizard walkthrough | 0 errors / 0 warnings ✅ | 0 (hold) |
| D2 | Page-to-page transitions (route changes animated, 150–300 ms, transform/opacity only) | 0 of 5 routes animated | 5 of 5 |
| D3 | Wizard step-change animation (slide/fade between steps, direction-aware) | none | direction-aware slide ≤ 300 ms |
| D4 | PostcardPreview flip | instant swap (no 3D) | perspective 3D flip ≤ 400 ms, keyboard-triggerable, reduced-motion → crossfade |
| D5 | Dashboard entry: staggered card/hero reveal | none | stagger ≤ 90 ms/item, total ≤ 600 ms |
| D6 | Async surfaces show skeletons, never full-page spinners | drafts: text-only empty state | skeletons on dashboard, history, preview |
| D7 | Interactive elements with hover + active + focus-visible states | partial (links only) | 100% of buttons/cards/inputs |
| D8 | Micro-interactions on dialogs/toasts/buttons (100–200 ms enter/exit) | toasts default; dialogs radix-default | consistent scale/fade tokens app-wide |
| D9 | Main JS chunk (gzip) | TBD tonight (first build) | ≤ 300 KB; TipTap lazy-loaded |
| D10 | Hardcoded hex colors in components (non-theme) | TBD (grep) | 0 — theme tokens only |

## Mobile — "animated, native-feeling"

| # | Metric | Baseline | Target |
|---|--------|----------|--------|
| M1 | Horizontal overflow at 320/360/390 px on dashboard + every wizard step | **+17 px on Review @ 390 px** ❌ | 0 px on all pages × 3 widths |
| M2 | Touch targets ≥ 44×44 px | **17 undersized** (Flip 39×16, step dots 32×32, nav 32 h) ❌ | 0 undersized |
| M3 | Inputs ≥ 16 px (no iOS focus zoom) + `inputmode`/`autocomplete` on address fields | **1 input @ 14 px; 0 inputmode attrs** ❌ | 0 undersized; inputmode on ZIP/phone |
| M4 | Bottom tab bar (thumb-reach nav) on < md viewports with animated active indicator | none — top nav only | bottom bar w/ active morph ≤ 200 ms |
| M5 | Wizard primary action fixed in thumb zone (safe-area padded, animated press) | in-flow buttons | sticky bottom bar, safe-area inset |
| M6 | Sheets/dialogs slide up from bottom edge with spring feel on mobile | centered fade (radix default) | slide-up ≤ 300 ms, backdrop fade |
| M7 | `prefers-reduced-motion` degrades ALL animations to opacity-only ≤ 1 frame | unverified | verified via emulated audit |
| M8 | Scroll: no rubber-band leaks, sticky header elevation on scroll | unverified | implemented |
| M9 | Tap highlight/selection: `-webkit-tap-highlight-color` transparent, `touch-action` set on gestures | unverified | implemented |

## Process gates (every round, non-negotiable)

1. `cd frontend && npx vitest run && pnpm lint` green; `pnpm build` green when types/bundle touched.
2. `E2E_BASE_URL=http://localhost:5175 npx playwright test` green (postcard-flow, responsive, ux-audit).
3. Orchestrator browser walkthrough passes with **no regression** vs the previous round's screenshots.
4. `prefers-reduced-motion` audit stays green after any new animation.

## Round plan (iterating toward the targets)

- **R1 — Shell & motion foundations:** motion tokens in tailwind config; route transitions (D2); dashboard stagger (D5); fix M1 overflow, M2 touch targets (worst offenders), M3 input zoom.
- **R2 — Preview & wizard:** 3D flip (D4), step transitions (D3), skeletons (D6).
- **R3 — Mobile native feel:** bottom tab bar (M4), sticky action bar (M5), sheet pattern (M6).
- **R4 — Micro-interactions & consistency:** D7, D8, M8, M9; hardcoded-color sweep (D10).
- **R5 — Performance:** bundle budget (D9), code-split editor, image lazy-load.
- Continuous: QA persona pass per round files `.issues/`; next round's implementation burns them P0-first.
