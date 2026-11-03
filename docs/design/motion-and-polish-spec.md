# Motion & Polish Spec — Modern Sleek Desktop, Native-Feeling Mobile

June (UX design), 2026-11-02. Implementation reference for `docs/design/ux-metrics.md` D2–D10, M4–M9.
Stack fixed by ADR 0001: DaisyUI 5 + radix-ui + framer-motion 12 + Tailwind 3.4. **No new dependencies.**

**Baseline contradictions in this worktree (verify, don't trust):** (1) D4 baseline says "instant swap" but `PostcardPreview.tsx:160-165` already renders a framer `rotateY` flip (600 ms, `perspective:1200px`, `preserve-3d`) — likely added after the 02:10 measurement; slice 4 refines it. (2) D2 baseline "0/5 animated" but `AppShell.tsx:112-119` animates route *entry* (fade+y, 200 ms) — the gap is exit animations. (3) Each page renders its own `<AppShell>` (DashboardPage:55, CreatePage:335, HistoryPage:31, NotFoundPage:22): the shell remounts per navigation, so AnimatePresence exits are structurally impossible — slice 2 fixes this first. (4) Wizard steps 1–2 render no panel, only a nav row (`CreatePage.tsx:437-466`); content edits inline in the preview. (5) The audit flags `sr-only` "Skip to content" and desktop pages as undersized — 44 px is a *touch* rule (M2); scope that check to the mobile project, exempt `sr-only`.

## 1. Motion tokens

New `frontend/src/utils/motion.ts`; Tailwind extension in `tailwind.config.js`. Everything animates **transform/opacity only**.

| Token | Duration | Easing | Use |
|---|---|---|---|
| `micro` | 120 ms | `0.2, 0, 0, 1` | press scale, tab pill, hover color |
| `standard` | 200 ms | `0.2, 0, 0, 1` | route enter, step slide, stagger items |
| `large` | 300 ms | `0.2, 0, 0, 1` | sheet, dialog, hero |
| `flip` | 400 ms | `0.4, 0, 0.2, 1` | PostcardPreview rotateY |
| exit | 120–150 ms | `0.4, 0, 1, 1` | all exits (faster than enter) |
| sheet | 300 ms | `0.32, 0.72, 0, 1` | iOS bottom-sheet curve (CSS path) |
| spring | — | `{type:'spring',stiffness:380,damping:40}` | sheet framer path, ~300 ms settle |

```ts
// frontend/src/utils/motion.ts
export const EASE = { enter: [0.2,0,0,1], exit: [0.4,0,1,1], standard: [0.4,0,0.2,1] } as const
export const T = {
  micro: { duration: 0.12, ease: EASE.enter }, standard: { duration: 0.2, ease: EASE.enter },
  large: { duration: 0.3, ease: EASE.enter }, exit: { duration: 0.12, ease: EASE.exit },
  flip: { duration: 0.4, ease: EASE.standard }, spring: { type: 'spring', stiffness: 380, damping: 40 },
} as const
export const staggerParent = { hidden: {}, show: { transition: { staggerChildren: 0.075, delayChildren: 0.05 } } }
export const staggerChild = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: T.standard } }
```

```js
// tailwind.config.js → theme.extend (CSS-side motion without framer)
transitionTimingFunction: { enter: 'cubic-bezier(0.2,0,0,1)', exit: 'cubic-bezier(0.4,0,1,1)', sheet: 'cubic-bezier(0.32,0.72,0,1)' },
transitionDuration: { micro: '120ms', standard: '200ms', large: '300ms', flip: '400ms' },
keyframes: {
  'overlay-in':  { from: { opacity:'0' }, to: { opacity:'1' } },
  'overlay-out': { from: { opacity:'1' }, to: { opacity:'0' } },
  'dialog-in':   { from: { opacity:'0', transform:'translate(-50%,-48.5%) scale(0.96)' }, to: { opacity:'1', transform:'translate(-50%,-50%) scale(1)' } },
  'dialog-out':  { from: { opacity:'1', transform:'translate(-50%,-50%) scale(1)' }, to: { opacity:'0', transform:'translate(-50%,-51.5%) scale(0.97)' } },
  'sheet-in':    { from: { transform:'translateY(100%)' }, to: { transform:'translateY(0)' } },
  'sheet-out':   { from: { transform:'translateY(0)' }, to: { transform:'translateY(100%)' } },
},
animation: {
  'overlay-in': 'overlay-in 150ms cubic-bezier(0.2,0,0,1) forwards', 'overlay-out': 'overlay-out 120ms cubic-bezier(0.4,0,1,1) forwards',
  'dialog-in': 'dialog-in 200ms cubic-bezier(0.2,0,0,1) forwards', 'dialog-out': 'dialog-out 150ms cubic-bezier(0.4,0,1,1) forwards',
  'sheet-in': 'sheet-in 300ms cubic-bezier(0.32,0.72,0,1) forwards', 'sheet-out': 'sheet-out 200ms cubic-bezier(0.4,0,1,1) forwards',
},
```
Radix keeps elements mounted while a close animation plays (internal `Presence`), so `data-[state=closed]:animate-dialog-out` unmounts cleanly with zero JS.

## 2. Route transitions (D2) — layout-route refactor first

`AppShell` must wrap the router, not be wrapped by pages. In `main.tsx`: one `<AppShell>` around `<AnimatePresence mode="wait" initial={false}><Routes location={location} key={location.pathname}>` (`useLocation` in a small inner component). Pages drop `<AppShell>` and render bare content; editor variant is derived (`pathname.startsWith('/create') || pathname.startsWith('/drafts/')`) instead of the prop.
```tsx
<motion.div key={location.pathname}
  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: T.standard }}
  exit={{ opacity: 0, y: -6, transition: T.exit }}><Outlet /></motion.div>
```
`initial={false}` = **no fake transition on first load** (covers hard refresh). Exit 120 + enter 200 ms fits D2's 150–300 ms. **Scroll caveat:** BrowserRouter has no ScrollRestoration — add `useEffect(() => window.scrollTo(0,0), [location.pathname])` in AppShell (no intra-page anchors exist, so back-nav-to-top is acceptable). **Suspense caveat:** lazy pages suspend inside AnimatePresence; first visit shows `<AppLoader/>` and kills that one exit — accept tonight, eager-import the 4 small pages in R5 if D9 allows. **Fallback** if the refactor overruns: keep per-page shells and the existing enter-only animation (metric says "animated", not "exit+enter"); don't ship half of both.

## 3. Wizard step transitions (D3)

In `CreatePage.tsx`: replace `step` state with `const [[step, dir], setStep] = useState<[number, 1|-1]>([0,1])` + `goTo(next)` setting `dir = next > step ? 1 : -1`; all `setStep` call sites (handleNext/Back, indicator, keyboard, prefill) go through `goTo`.
```tsx
const stepVariants = { enter: (d:number) => ({ x: d*32, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d:number) => ({ x: d*-32, opacity: 0 }) }
<AnimatePresence mode="wait" custom={dir} initial={false}>
  <motion.div key={step} custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit"
    transition={T.standard} className="min-h-[320px] md:min-h-[300px]">
```
**Height stability:** wrapper carries `min-h-[320px]` (country panel + nav-only rows); Address/Review exceed it and grow once at swap, below the sticky preview — accepted, **no height animation** (violates transform/opacity); `mode="wait"` prevents stacking. **Indicator morph** (`CreatePage.tsx:340-372`): active circle becomes `{isActive && <motion.span layoutId="step-pill" className="absolute inset-0 rounded-full bg-clay" transition={T.micro} />}` with the number in `relative z-10`; connector fill via `motion.div initial={{scaleX:0}} animate={{scaleX: i<step?1:0}} className="origin-left"` (replaces the `bg-clay`/`bg-ink-line` conditional). Move the mobile fixed toolbar **out of** AnimatePresence (today a keyless child inside it, `CreatePage.tsx:453`) into WizardActionBar (slice 8).

## 4. PostcardPreview 3D flip (D4)

**Keep framer `rotateY`** over hand-rolled CSS: back-face interactive zones (dropzone root, editors) keep pointer events, and `useReducedMotion()` gives a one-line branch. Changes at `PostcardPreview.tsx:160-165`:
```tsx
const reduce = useReducedMotion()
<motion.div animate={reduce ? { opacity: 1 } : { rotateY: showBack ? 180 : 0 }} transition={T.flip} ...>  {/* 600ms → 400ms */}
  {/* Front: add animate={{ opacity: reduce ? (showBack ? 0 : 1) : 1 }} transition={{ duration: 0.15 }} */}
  {/* Back:  add animate={{ opacity: reduce ? (showBack ? 1 : 0) : 1 }} transition={{ duration: 0.15 }} */}
```
Reduced-motion fallback: crossfade **≤150 ms**; drop the back face's `transform: rotateY(180deg)` inline style when `reduce` (else mirrored); keep `backfaceVisibility:'hidden'` only on the 3D path. **Keyboard:** the Flip control (`:140-148`) is already a real `<button>` — add page-level `f` shortcut in CreatePage's key handler (`:167-183`, same typing guard), `aria-keyshortcuts="F"`, `title="Flip card (F)"`. **Mobile tap:** worst audit offender (39×16, M2) — make it `min-h-11 min-w-11 px-3`, label "Flip". Do **not** add tap-to-flip on the card: front tap opens the file picker, back zones are editors; conflicting gestures destroy preview trust.

## 5. Dashboard stagger (D5)

`DashboardPage.tsx`: hero (`:58-79`), header row (`:82-107`), draft cards (`:134-200`) get `variants={staggerChild}` under one parent `motion.div variants={staggerParent} initial="hidden" animate="show"`. Timing: hero 0 / header 75 ms / cards 150·225·300 ms, 200 ms each → last lands ≈500 ms, **≤600 ms total**. Cards keep `role="button"` + keyboard handler. **Once per session:** module-level `let dashboardAnimated = false`, set in `onComplete`; on re-mount pass `initial={false}` so back-nav doesn't replay (reload resets — intended). Reduced motion: `MotionConfig reducedMotion="user"` (`main.tsx:24`) already skips the y-shift, keeps the fade.

## 6. Skeletons (D6)

Replace all three full-page spinners with **DaisyUI `skeleton` + pulse** (shimmer rejected: custom gradient-sweep keyframe for marginal gain; pulse ships with DaisyUI, reads calmer). Blocks `aria-hidden`; container `aria-busy="true"` + sr-only "Loading…". Surfaces: dashboard drafts `DashboardPage.tsx:119-122` (3 cards: `aspect-[3/2]` block + two `h-3` lines), history `HistoryPage.tsx:40-43` (3 rows: `h-16 rounded-lg` + inner lines), wizard draft load `CreatePage.tsx:255-263` (`aspect-[3/2] max-w-[640px]` preview shape). Pattern: `<div className="skeleton motion-reduce:animate-none bg-zinc-200 dark:bg-zinc-800" aria-hidden />` — `motion-reduce:animate-none` mandatory (M7). `AppLoader` (bootstrap suspense) keeps its spinner; not an async surface.

## 7. Micro-interactions (D7/D8)

**Press scale — CSS, not framer** (~40 raw `<button>` sites, no shared Button component). `index.css` `@layer utilities`:
```css
.press { transition: transform 120ms cubic-bezier(0.2,0,0,1), background-color 120ms cubic-bezier(0.2,0,0,1), color 120ms cubic-bezier(0.2,0,0,1), border-color 120ms cubic-bezier(0.2,0,0,1), opacity 120ms cubic-bezier(0.2,0,0,1); }
.press:active:not(:disabled) { transform: scale(0.98); }
@media (prefers-reduced-motion: reduce) { .press:active:not(:disabled) { transform: none; } }
```
Apply `press` to every button/CTA link (batch per file); remove old `transition-colors` where it lands (they fight). Primary CTAs add `active:scale-[0.97]`. **Dialogs** (`ConfirmDialog.tsx`): overlay → `data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out`; content keeps `-translate-x-1/2 -translate-y-1/2`, gains `data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out` (keyframes bake in the centering translate). **Toasts:** sonner's enter/exit (~250 ms slide+fade) is library-internal and **not configurable** — accepted deviation from the 100–200 ms band, recorded rather than faked with CSS overrides; surface tokens via `toastOptions.classNames` only. **Focus rings:** `index.css:19-30` structure is right (2 px/offset 2; `#18181b` light, `#e4e4e7` dark, `#E09A6B` editor) — add `focusRing`/`focusRingDark` under `theme.extend.colors`, reference via CSS vars so D10's grep whitelists one place; `DashboardPage.tsx:140` card ring aligns to the same token.

## 8. Mobile native feel (M4–M9)

**Bottom tab bar (M4)** — AppShell, `md:hidden`, **default variant only**; `variant="editor"` (wizard) renders none — the wizard owns the bottom edge (M5). Header History/New links become `hidden md:inline-flex`.
```tsx
<nav aria-label="Primary" className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur pb-[env(safe-area-inset-bottom,0px)]">
  <div className="grid grid-cols-3 h-14">
    {TABS.map(t => ( // Home '/', Create '/create', History '/history'
      <Link key={t.to} to={t.to} aria-current={active ? 'page' : undefined}
        className="relative flex flex-col items-center justify-center gap-0.5 min-h-11 text-zinc-500 aria-[current=page]:text-zinc-900 dark:aria-[current=page]:text-white transition-colors duration-micro ease-enter">
        {active && <motion.span layoutId="tab-pill" className="absolute inset-x-5 -top-px h-0.5 rounded-full bg-zinc-900 dark:bg-white" transition={T.micro} />}
        <t.icon className="w-6 h-6" /><span className="text-[11px]">{t.label}</span>
      </Link>))}
  </div>
</nav>
```
Morph: `layoutId` pill, transform-only, 120 ms (≤200 ms). Main gains `pb-20 md:pb-8`. DaisyUI 5 has a `dock` component; if its CSS fights the pill, plain grid + tokens wins (the pill is the feature, `dock` is chrome). **Sticky wizard action bar (M5)** — new `frontend/src/components/wizard/WizardActionBar.tsx`, rendered by CreatePage **outside** AnimatePresence: `md:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-surface/90 backdrop-blur border-t border-ink-line/60 h-16 pb-[env(safe-area-inset-bottom,0px)]`; Back (ghost, `min-h-11`) left, primary (`bg-clay text-ink-bg rounded-full min-h-11 px-6 press active:scale-[0.97]`) right. Steps 1–2 reuse existing handlers; steps 3–4 lift actions via `actionRef?: MutableRefObject<{ submit?(): void; send?(): void } | null>` props that `AddressStep`/`ReviewStep` populate with their existing `handleSubmit`/`onSend` — validation stays in the steps, zero duplication; hide steps' in-panel action rows (`max-md:hidden`). Step 0 exempt (tap-a-country *is* the action, thumb-reachable). Keep `pb-28` on CreatePage content.
**Bottom-sheet dialogs (M6)** — ConfirmDialog Content responsive: `max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:translate-x-0 max-md:translate-y-0 max-md:w-full max-md:rounded-b-none max-md:rounded-t-[20px] max-md:data-[state=open]:animate-sheet-in max-md:data-[state=closed]:animate-sheet-out md:data-[state=open]:animate-dialog-in md:data-[state=closed]:animate-dialog-out`. The iOS curve at 300 ms delivers "spring feel"; chosen over a framer spring to keep one mechanism (radix `data-state`) across breakpoints, no `forceMount`. `borderRadius.sheet` (20 px) exists. Drag-to-dismiss out of scope (AlertDialog demands an explicit answer; ADR 0001 rejected vaul — future ADR if a non-modal sheet lands).
**Scroll elevation (M8)** — header: passive listener, `window.scrollY > 4` → `data-elevated`; elevation as opacity-animated pseudo-element (transform/opacity-only): `after:absolute after:inset-x-0 after:top-full after:h-4 after:shadow-[0_1px_3px_rgb(0_0_0/0.08)] after:opacity-0 after:transition-opacity after:duration-micro data-[elevated=true]:after:opacity-100` (`rgb(0 0 0/0.3)` in editor). Plus `body { overscroll-behavior-y: none; }`. **Tap/selection (M9)** — index.css base: `html { -webkit-tap-highlight-color: transparent; }`; `button, a, [role="button"], input, select, textarea, summary { touch-action: manipulation; }`. **iOS input zoom (M3)** — index.css base: `@media (max-width:767px) { input, select, textarea { font-size: 16px !important; } }` (`!important` deliberate — beats per-component `text-sm`/`text-[13px]`, e.g. InlineMessageEditor's 13 px textarea). `AddressStep.tsx` field(): `postalOrZip` gets `inputMode={countryCode === 'US' ? 'numeric' : 'text'}`; autocomplete: `given-name`, `family-name`, `address-line1`, `address-line2`, `address-level2` (city), `address-level1` (state), `postal-code`.

## 9. Reduced motion (M7) — global rules

`MotionConfig reducedMotion="user"` is live. Degradation per surface: route/step/stagger → opacity fade, transforms skipped; flip → 150 ms crossfade (slice 4); skeletons → static (`motion-reduce:animate-none`); press → scale off via the utility's media query; tab pill → keeps 120 ms slide (transform); sheet/dialog → opacity-only. Belt-and-braces in index.css base: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: 1ms !important; animation-duration: 1ms !important; animation-iteration-count: 1 !important; } }` — exempts nothing, DaisyUI pulse included.

## 10. Implementation order for Sam

Tokens land first (everything imports them); the shell refactor precedes all page-level commits (same files).
1. `chore(motion): tokens` — tailwind.config.js, `utils/motion.ts`, index.css globals (press/tap-highlight/touch-action/overscroll/16 px).
2. `refactor(shell): layout route` — main.tsx, AppShell.tsx, 4 pages drop AppShell; route AnimatePresence (D2). **Before any page-level commit.**
3. `feat(dashboard): stagger + skeletons` — DashboardPage.tsx (D5, D6).
4. `feat(history): skeletons` — HistoryPage.tsx (D6).
5. `feat(wizard): direction-aware steps` — CreatePage.tsx (D3) + indicator morph.
6. `feat(wizard): sticky action bar` — CreatePage.tsx, WizardActionBar.tsx, AddressStep.tsx, ReviewStep.tsx (M5); sequential after 5 (hot file).
7. `feat(preview): flip polish` — PostcardPreview.tsx (D4); independent of 5/6.
8. `feat(mobile): tab bar + header elevation` — AppShell.tsx (M4, M8).
9. `feat(ui): dialog/sheet motion` — ConfirmDialog.tsx (D8, M6).
10. `chore(a11y): press + inputmode sweep` — broad touch, **last** (D7, M3, D10: `PostcardPreview.tsx:230 bg-[#fffef8]` → `bg-paper`; index.css hexes are the token source — exempt; TEXT_COLORS hexes are the print contract — exempt).

Every commit: `npx vitest run && pnpm lint` green; `pnpm build` when types/config touched; `E2E_BASE_URL=… npx playwright test` before merge; re-run ux-audit after rounds 2/3/4 (process gates in the metrics doc).

## Test checklist (→ Vitest/Playwright)

- AppShell: tab bar at 390 px mock, absent at 1280 px and in editor variant; header History/New hidden < md.
- Routes: AnimatePresence wraps Routes; first mount renders without initial animation (`initial={false}`); scroll resets on pathname change.
- Wizard: `goTo` sets dir −1 on back; panel `key={step}`; `layoutId="step-pill"` present; `actionRef.current.submit` runs AddressStep validation, blocks on bad ZIP.
- Flip: button ≥44×44 at 390 px; `useReducedMotion()===true` renders no `rotateY`, both faces carry the opacity branch; `f` key flips outside typing contexts.
- Skeletons: loading renders 3 skeleton blocks in an `aria-busy` container; no `animate-spin` outside AppLoader (grep test).
- ConfirmDialog: `data-[state=open]:animate-*` + `max-md:` sheet classes present.
- E2E ux-audit: mobile `undersizedTargets` drops Flip/dots/nav entries; `transitionedElements` up on all pages; emulated `prefers-reduced-motion` shows no `rotateY` mid-flip (M7); console clean (D1 hold).
