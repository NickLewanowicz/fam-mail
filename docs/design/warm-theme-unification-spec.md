# Warm theme unification spec (kill the white dashboard)

**Problem.** Two visual products ship: Dashboard/History/Login/default-AppShell render zinc light (+ a dark toggle), the editor renders warm ink. Unify: **one warm theme, no toggle, no `dark:` variants**. The editor shell (`AppShell.tsx` variant `'editor'`) is the reference; every default-variant surface adopts it.

## 1. Token mapping (file-referenced, one row per current light class)

Shared shell — `frontend/src/components/layout/AppShell.tsx` (default variant collapses to the editor twin; delete per-variant ternaries):

| Current (default variant) | Warm replacement |
|---|---|
| root `bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100` | `bg-ink-bg text-warm-text` |
| skip-link `focus:bg-zinc-900 focus:text-white` | `focus:bg-clay focus:text-ink-bg` |
| nav `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800` shadow `0.08` | reuse editor branch: `bg-ink-surface/90 backdrop-blur border-ink-line/60` shadow `0.3` |
| wordmark `text-zinc-900` | `text-warm-text font-display tracking-tight` |
| nav links inactive `text-zinc-600 hover:…bg-zinc-100 dark:…` | `text-warm-text2 hover:text-warm-text hover:bg-white/5` |
| "New" active `bg-zinc-900 text-white` | `bg-clay text-ink-bg` |
| avatar circle `bg-zinc-200 text-zinc-600` | `bg-ink-raised text-warm-text` (10.05:1) |
| account menu `bg-white border-zinc-200` / label `text-zinc-500` | `bg-ink-raised border-ink-line` / `text-warm-text2` (5.53:1) |
| Sign out `text-red-600 hover:bg-red-50` | `text-red-400 hover:bg-red-900/30` — **measure first** |
| tab bar `border-zinc-200 bg-white/95 dark:bg-zinc-900/95` | `border-ink-line bg-ink-surface/95` |
| tabs `text-zinc-500` / active `text-zinc-900 dark:text-white` / pill `bg-zinc-900 dark:bg-white` | `text-warm-text2` (6.38:1 on surface) / `text-warm-text` / pill `bg-clay` |
| `VersionFooter` `text-zinc-500` | drop tone branches, always `text-warm-text3` (5.18:1 on ink.bg) |

`DashboardPage.tsx`:

| Current | Warm replacement |
|---|---|
| hero `bg-zinc-900` / h1 `text-white` / p `text-zinc-400` | `bg-ink-surface` / `text-warm-text` / `text-warm-text2` |
| hero CTA `bg-white text-zinc-900 hover:bg-zinc-100` | `bg-clay text-ink-bg hover:bg-clay-hover` (4.74/5.95:1) |
| search input `border-zinc-200 bg-white … focus:border-zinc-400` | `bg-ink-raised border-ink-line … focus:border-warm-ring` |
| refresh `text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800` | `text-warm-text2 hover:bg-white/5` |
| spinner `border-zinc-300 border-t-zinc-600` | `border-ink-line border-t-clay` |
| skeletons `bg-zinc-200 dark:bg-zinc-800` (also `CreatePage.tsx:390`) | `bg-ink-raised`, delete `dark:` |
| card `bg-white border-zinc-200 hover:border-zinc-300 ring-zinc-900` | `bg-ink-surface border-ink-line hover:border-clay/60 focus-visible:ring-warm-ring` |
| photo well `bg-zinc-100` / "No photo" `text-zinc-300` | `bg-ink-bg` / `text-warm-text3` (4.56:1 — tight) |
| name `text-zinc-900` / meta `text-zinc-500` | `text-warm-text` / `text-warm-text2` |
| ready chip `bg-green-50 text-green-700`; default `bg-zinc-100 text-zinc-500` | `bg-green-900/40 text-green-300`; `bg-ink-raised text-warm-text2` |
| scheduled chip `bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300` | keep only the `dark:` pair |
| card footer `border-zinc-100` / Export/Delete `text-zinc-500 hover:text-zinc-900` / Delete hover `text-red-600` | `border-ink-line/50` / `text-warm-text2 hover:text-warm-text` / `hover:text-red-400` — **measure red-400 on ink.surface** |
| empty `border-zinc-200` / `text-zinc-500` | `border-ink-line` / `text-warm-text2` |

`HistoryPage.tsx`: h1/link/rows/buttons same patterns as above; `STATUS_STYLES` → sent `bg-green-900/40 text-green-300`, delivered `bg-blue-900/40 text-blue-300`, failed `bg-red-900/40 text-red-300`, fallback `bg-ink-raised text-warm-text2`; "Load more" `border-zinc-300 text-zinc-700 hover:bg-zinc-100` → `border-ink-line text-warm-text hover:bg-white/5`; error `text-red-600` → `text-red-400`.

`LoginPage.tsx`: page `bg-zinc-50` → `bg-ink-bg` (drop the local `data-theme="fammail"` — html already sets it); h1/sub → `text-warm-text`/`text-warm-text2`; card `bg-white border-zinc-200` → `bg-ink-surface border-ink-line`; error box `bg-red-50 border-red-200 text-red-700` → `bg-red-900/40 border-red-700/50 text-red-300`; Sign In `bg-zinc-900 text-white hover:bg-zinc-800` → `bg-clay text-ink-bg hover:bg-clay-hover`; "Secured with OAuth" `text-zinc-500` → `text-warm-text3`.

Also: `ProtectedRoute.tsx` + `AppLoader.tsx` `bg-zinc-50` + `data-theme` attr → `bg-ink-bg`, drop attr (their spinners → `border-ink-line border-t-clay`); `AuthCallbackPage.tsx` `bg-base-200 data-theme="light"` → `bg-ink-bg`, drop attr; `NotFoundPage.tsx` heading/link → `text-warm-text` / `border-ink-line text-warm-text2 hover:bg-white/5`; `ErrorBoundary.tsx` `bg-zinc-50 dark:bg-zinc-950` → `bg-ink-bg`, h2/p → `text-warm-text`/`text-warm-text2`.

## 2. Toggle removal

- `AppShell.tsx`: delete `dark` state, `toggleTheme`, and the entire sun/moon `<button>` block (lines ~99–114). No localStorage write remains.
- `frontend/index.html`: delete the whole inline theme `<script>` (reads `fam_mail_theme`, sets `fammail-dark`); keep static `<html data-theme="fammail">`; keep `theme-color #3B1D1E`.
- `tailwind.config.js`: delete `darkMode: 'class'`; delete the `fammail-dark` theme block. **Re-point `fammail`** so DaisyUI primitives (dropdown, skeleton, toasts, ConfirmDialog) stop rendering white: primary `#CE7A57`/content `#3B1D1E`, secondary `#C7AEA3`/`#3B1D1E`, accent `#E09A6B`/`#3B1D1E`, neutral `#562D2E`/`#F7EDE5`, base-100 `#482527`, base-200 `#3B1D1E`, base-300 `#6B3A38`, base-content `#F7EDE5`; copy semantic values from the deleted dark block (info `#60a5fa`, success `#4ade80`, warning `#fbbf24`, error `#f87171` + their `-content`), radius/animation tokens unchanged.
- `index.css`: body → `@apply bg-ink-bg text-warm-text`; global `:focus-visible` outline → `#E09A6B`; delete `.dark :focus-visible` **and** the `[data-editor] :focus-visible` rule (now redundant).
- Header slot after removal: **nothing added**. At 320px the right side is logo + account avatar (History/New are `hidden md:`, badge `hidden sm:`) — no crowding, no MOCK-chip relocation needed (Review banner already covers phones; `responsive.spec.ts` chip test is unaffected).

## 3. Contrast proof plan (harness: `frontend/tests/screenshots/contrast-check.spec.ts`)

The dashboard sweep now sweeps the dark page — mechanics unchanged. Sam measures **before** wiring, in order:
1. `warm-text3 #A99288` on `ink-raised #562D2E` = **3.95 — fails AA small text; forbidden pair.** (On `ink-surface` it's 4.56 — allowed but thin; prefer `text2` for ≤12px.)
2. Chip composites: `green/blue/red-300` on `*-900/40` over ink surfaces (alpha-composited by the harness) — verify ≥4.5.
3. `red-400 #F87171` on `ink-surface`/`ink-raised` (Sign out, Delete, failed, error text).
4. `ink-bg` on `clay` = 4.74 — passes; **never** `text-warm-text` on clay (2.78). Clay is always a fill with ink-bg text.
5. Harness gap: mock drafts state hides the "No photo" placeholder from the sweep — add one seeded-draft case to the dashboard sweep or verify manually (warm-text3/ink-surface 4.56).
Placeholders (`placeholder:warm-text3`) aren't swept — manual check.

## 4. Cleanup

- **Delete**: all `dark:` variants (6 files: AppShell, DashboardPage, HistoryPage, CreatePage:390, NotFoundPage, ErrorBoundary); `fammail-dark` block; `darkMode:'class'`; index.html script; toggle button/state; `.dark :focus-visible`; `[data-editor] :focus-visible`; per-page `data-theme` attrs (LoginPage, ProtectedRoute, AppLoader, AuthCallbackPage).
- **Tests**: no Vitest unit test asserts zinc/toggle classes (verified by grep) — zero unit-test edits expected. Playwright: rename sweep title "light (dashboard)" → "dashboard (warm)"; rerun `capture.spec.ts` to regenerate all 14 `docs/screenshots/*.png` in the unified theme (update `docs/screenshots/README.md` manifest note); rerun `tests/e2e/responsive.spec.ts` (320/390 floors) and ux-audit/qa-audit specs.

## 5. Acceptance checks

- `grep -rn "dark:" frontend/src` → 0 hits; `grep -rn "zinc-" frontend/src` → 0 hits (paper face uses `paper` tokens, not white).
- `grep -rn "fam_mail_theme\|fammail-dark\|darkMode\|Toggle dark mode" frontend/` → 0 (docs excluded).
- `grep -rn "bg-white\|bg-zinc-50" frontend/src` → 0; `grep -rn "data-theme=\"light\"" frontend/src` → 0.
- `npx playwright test tests/screenshots/` green (both sweeps, all 320px/390px floors); `npx vitest run`, `pnpm lint`, `pnpm build` green.
- Visual: login → dashboard → create → history reads as one continuous warm surface; nav/card/tab treatment identical between dashboard and editor.

## Alternative (rejected default)

A light warm variant (clay.soft pages) could survive for low-vision users who prefer light — but `warm-text2` on `clay.soft` = 1.97 and every chip/CTA pair would need reproofing; the zinc dark-mode pairs already prove dark AA. If a light request returns later, propose it as a new DaisyUI theme + ADR, not a resurrection of the toggle.
