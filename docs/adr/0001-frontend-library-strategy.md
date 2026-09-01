# ADR 0001: Frontend Library Strategy

- Status: Accepted — Phase 1 (utility UX) implemented 2026-09-01; Phases 2–4 scheduled
- Date: 2026-09-01
- Deciders: Maintainer, Elias (frontend architecture review)

## Context

Fam-mail's differentiating core is the postcard preview (3D flip, safe-zone geometry, per-country postal specs in `postcardTemplate.ts`) and the print HTML pipeline (markdown/HTML → sanitized card canvas → PostGrid). Those stay custom. Everything else — editing, forms, upload, toasts, confirm dialogs — is generic UI plumbing where hand-rolled code has accumulated known bugs and maintenance debt.

Inventory of custom plumbing (non-core), Sept 2026:

| Area | Files | LOC | Pain |
|---|---|---|---|
| Rich-text-lite editor | `frontend/src/components/postcard/InlineMessageEditor.tsx` | 204 | String prefix/suffix markdown wrapping with manual `setSelectionRange` restoration; recently patched for emphasis/span interleaving; no undo; fragile |
| Address forms | `wizard/AddressStep.tsx`, `postcard/InlineAddressForm.tsx` | 205 + 120 | Two parallel form state maps + error maps, duplicated `field()` render helper, validation only checks required (postal/state formats live in backend) |
| Wizard shell | `pages/CreatePage.tsx` | 339 | Step gating, transition boilerplate — acceptable, product-shaped, keep |
| Photo upload | `wizard/PhotoStep.tsx` + validation duplicated across `imageProcessing.ts`, `api.ts`, `PostcardPreview.tsx` | ~80 of 379 | Hand-rolled drag/drop, FileReader, type+size checks in 4 files |
| Error UX | inline banners in `CreatePage.tsx`, `PhotoStep.tsx`, etc. | ~30 | Repeated pattern, no toasts, disappears on nav |
| Destructive actions | `window.confirm` in `PostGridModeBadge.tsx:38`, `DashboardPage.tsx:30` | ~10 | Blocking, unstyled, not testable |

Stack facts verified today: `daisyui 5.5.4` with `tailwindcss 3.4.18` (JS-config plugin), Vite 5.0.x, React 18.2, Vitest 1.x.

**Critical finding:** DaisyUI 5 officially requires Tailwind CSS 4 (daisyui.com/docs/v5: "daisyUI 5 works with Tailwind CSS 4"); the supported pairing for Tailwind 3 is DaisyUI 4, which no longer receives feature support. Our DaisyUI 5 + Tailwind 3.4 combo happens to run via the legacy JS plugin entry but is **off the golden path and unsupported**. Any library strategy must resolve this first.

## Decision

1. **Component layer:** Keep DaisyUI 5 as the styling/theme layer; adopt **headless primitives from the unified `radix-ui` package** for interactive behavior (alert-dialog, popover, dropdown-menu, tooltip). No second styled kit. Migrate **Tailwind 3.4 → 4** (with Vite ≥5.2) to return to the supported DaisyUI 5 path. Tailwind 4 is the only prerequisite for the chosen stack; Radix itself is CSS-agnostic.
2. **Rich text:** Adopt **TipTap 3** (`@tiptap/react` 3.30.x, MIT) with a hand-picked extension list constrained to the message HTML contract, official `@tiptap/markdown` (added in TipTap 3.7) for markdown in/out, and `TextStyle` + `Color` (emits exactly `<span style="color:...">`) with a preset palette. Server-side DOMPurify (`backend/src/utils/htmlSanitizer.ts`, 362 LOC) remains the sole authority; editor output is untrusted input. Delete the custom editor's string-wrapping engine.
3. **Forms:** Adopt **react-hook-form 7.87 + zod** for multi-field forms only (AddressStep, InlineAddressForm). Keep plain controlled inputs for 1–2-field forms (CountryStep, login). The AGENTS.md ban is deliberately revised (see Consequences).
4. **Utilities:** Adopt `react-dropzone` (20.1.1, actively maintained, Aug 2026 release) for file input/drag-drop, `sonner` (2.0.8, MIT, ~48M weekly downloads) for toasts, and `radix-ui` AlertDialog for confirms. Do **not** adopt @dnd-kit or vaul (no use case today).

## Options considered

### Component layer

- **shadcn/ui wholesale** — Rejected. As of July 2026 shadcn's default primitive backend is Base UI (ui.shadcn.com/docs/changelog/2026-07-base-ui-default), and its generated components style the same slots DaisyUI already styles (buttons, cards, forms). Two styling systems fighting over `btn`/`card` is the classic failure mode. Its registry/CLI model also assumes a level of per-component vendoring that duplicates what DaisyUI gives us free. We cherry-pick the *pattern* (Radix behavior + our classes) without the kit.
- **Mantine / Chakra UI** — Rejected. Both are full kits with their own styling engines and component CSS; they would fight Tailwind/DaisyUI on every pixel and add ~100 kB+. Wrong shape for an app that already has a coherent DaisyUI theme.
- **Headless UI** — Rejected. Smaller primitive set (no popover/menu breadth vs Radix) and slower release cadence; Tailwind Labs' attention is on Tailwind v4.
- **Base UI** — Watchlist, not adopted. It is the new shadcn default and production-credible, but v1 is young relative to Radix's decade of a11y hardening; Radix is unified into one package (`radix-ui`, Feb 2026 migration) and fully supported. Revisit if Radix stagnates.
- **DaisyUI-only (status quo)** — Rejected. DaisyUI's dialog/popover are CSS-only and lack focus trapping, scroll locking, and a11y semantics we currently fake by hand.

### Rich text

- **TipTap 3 (chosen)** — Schema-driven: the set of tags that can exist in the document is exactly the set of registered extensions, so restricting to our contract is declarative: `StarterKit.configure({ link: false, ... })` plus `Underline` (bundled in StarterKit v3), `Strike`, `Subscript`, `Superscript`, `TextStyle`+`Color`. StarterKit v3 includes Underline and Link out of the box (tiptap.dev/blog/release-notes/tiptap-3-0-is-stable); we disable Link (not in contract). TextStyle renders only `<span>` with inline style, e.g. `<span style="color:#dc2626">` (tiptap.dev/docs/editor/extensions/functionality/color) — a 1:1 match with our `COLOR_STYLE_PATTERN`. The official `@tiptap/markdown` handles markdown↔ProseMirror; anything odd that slips through markdown parsing is still dropped server-side by DOMPurify. Headings, lists, blockquote, code, `hr` are all in StarterKit. Active: 3.30.x patches shipping continuously; StarterKit pins exact core versions.
- **Lexical** — Rejected for this use. Excellent editor, but JSON-first with markdown as an add-on; producing a *specific HTML subset* means custom serialization work, and its API surface (worker/listener model) is heavier than a 500-char postcard message needs.
- **BlockNote / Novel** — Rejected. Notion-style block UX is wrong for a hand-written card message, and Novel is a TipTap wrapper anyway — more abstraction, same engine.
- **Quill** — Rejected. Slower maintenance cadence and weakest story for constrained HTML + markdown interop.
- **Keep custom textarea** — Rejected. The prefix/suffix engine has already required interleaving patches (`**<span>word</span>**` bug), has no undo, and every new format multiplies the state-machine cost. The 204 LOC is not the problem; the bug class is.

### Forms

- **react-hook-form + zod (chosen for multi-field)** — RHF 7.87.0 (~60M weekly downloads, releases days ago) with `@hookform/resolvers` + zod is the 2026 default adoption winner (pkgpulse 2026 comparison). Zod schemas for US/CA/GB postal + state formats can later be shared with the Bun backend, which already owns richer validation. Uncontrolled-by-default kills our re-render-per-keystroke dual-state pattern.
- **TanStack Form v1** — Rejected. Stronger typing and cross-framework, but more boilerplate (LogRocket comparison) and a fraction of RHF's ecosystem; no cross-framework need here.
- **Keep hand-rolled everywhere** — Rejected for multi-field. AddressStep maintains two form objects, two error maps, a parameterized `field()` helper with an `isReturn` boolean threaded through every input — the exact shape RHF removes. However, for 1–2-field forms (country picker, login) RHF's provider/handler ceremony costs more than `useState`; controlled inputs stay there.

### Utilities

- **react-dropzone 20.x** (chosen) — Hooks-first, headless, ~5–12M weekly downloads, "healthy" maintenance (Snyk), v20.1.1 released Aug 2026. Replaces the hand-rolled drag/drop + hidden-input plumbing and gives one home for accept/size validation currently duplicated in `PhotoStep.tsx`, `imageProcessing.ts`, `api.ts`, `PostcardPreview.tsx`.
- **sonner 2.0.8** (chosen) — The de facto React toast (~48M weekly downloads, MIT, shadcn's default toast). One `<Toaster />` mount; replaces repeated error banners and gives success feedback ("Draft saved") that doesn't exist today.
- **radix-ui AlertDialog** (chosen) — Replaces both `window.confirm` calls; focus-trapped, testable with Testing Library, styled with DaisyUI tokens.
- **@dnd-kit, vaul** — Not adopted. No drag-reorder or drawer use case exists in the product. Adding libraries speculatively is the failure mode this ADR exists to prevent. framer-motion 12 stays as-is.

## Consequences

**Positive:** The fragile bug class (selection restoration, markdown interleaving) is owned by TipTap's schema instead of us; address validation becomes declarative and shareable with the backend; upload validation gets one implementation; destructive actions become accessible and testable; we return to the supported Tailwind 4 + DaisyUI 5 path.

**Negative / costs:** TipTap StarterKit is ~103 kB gzipped unbundled — tree-shaken to our extension set and code-split behind the message step it lands well under that, but it is the largest dependency added. Tailwind 4 migration touches every stylesheet boundary (CSS-first config, `@plugin "daisyui"`, browserslist bump: Safari 16.4+/Chrome 111+). RHF is a new pattern contributors must learn; the AGENTS.md rule must change.

**Custom code deleted (net ~250 LOC, more after follow-ups):**
- `InlineMessageEditor.tsx` string-wrapping engine (~150 of 204 LOC: `applyFormat`, emphasis "hug" loop, `setSelectionRange` juggling) — replaced by TipTap commands + a ~60 LOC palette shell.
- `AddressStep.tsx` dual state/error maps + `field()` helper (~70 of 205 LOC) — replaced by `useForm` + one zod schema; same for `InlineAddressForm.tsx`.
- Drag/drop + hidden-input plumbing in `PhotoStep.tsx` (~35 LOC) and the duplicated validation block destined for consolidation with `imageProcessing.ts`.
- Inline error-banner markup in `CreatePage.tsx` (~15 LOC) → `toast.error()`.
- Both `window.confirm` call sites.

**Sanitization unchanged:** client `messageSanitizer.ts` keeps rendering preview HTML; `backend/src/utils/htmlSanitizer.ts` remains the authority for anything reaching PostGrid. TipTap output is treated as untrusted input, same as today's raw textarea. This is explicit: **no library is trusted to make HTML safe for print.**

## Migration plan

Phases are independently shippable; each ends green on `npx vitest run`, `pnpm lint`, `pnpm build`.

**Phase 1 — Utility UX (≈4–6 h, highest value / lowest risk).** Add `sonner`; mount `<Toaster />` in `App.tsx`; replace the CreatePage/PhotoStep error banners and DashboardPage confirm. Add `radix-ui`; build `ConfirmDialog` on AlertDialog; swap both `window.confirm` sites. Add `react-dropzone`; rewrite `PhotoStep` input/drop handling; fold shared validation into `imageProcessing.ts`. ~3 new deps, zero visual regression risk beyond toasts.

**Phase 2 — Tailwind 4 + DaisyUI 5 golden path (≈4–6 h).** Bump Vite to ≥5.2 (latest 5.x), add `@tailwindcss/vite`, port `tailwind.config.js` theme to CSS-first (`@theme`, `@plugin "daisyui"`, `@plugin "@tailwindcss/typography"`), drop autoprefixer/postcss config, run the DaisyUI upgrade codemods. Requires Node 20+. This is deliberate sequencing: do it *before* the editor/forms work so new components land on the final styling base.

**Phase 3 — TipTap 3 editor (≈6–8 h, highest value).** Install `@tiptap/react @tiptap/starter-kit @tiptap/markdown @tiptap/extension-text-style @tiptap/extension-subscript @tiptap/extension-superscript`. Configure StarterKit with `link: false`, `codeBlock` allowed per contract; add Underline (v3 built-in), Strike, Sub/Superscript, TextStyle+Color restricted to the six `TEXT_COLORS` presets (custom command wrapper). Markdown in via `contentType: 'markdown'`, out via `editor.markdown.serialize()`. Wrap in a `MessageEditor` replacing `InlineMessageEditor`'s toolbar shell; keep the 500-char counter as a `maxLength` guard around transactions. Add tests: round-trip markdown, palette output is `span[style^="color:"`, disallowed paste (e.g. a table) is dropped.

**Phase 4 — react-hook-form + zod address forms (≈4–6 h).** `zod` schema for `Address` (required fields + US ZIP / CA postal / GB postcode + 2-letter region refinement mirroring backend rules), `@hookform/resolvers`; rewrite AddressStep and InlineAddressForm. Keep visual markup; delete the dual state maps and `field()` helper. Reuse opportunity (follow-up): mirror the same schema in `backend/` for drafts validation.

**Do NOT adopt:** shadcn/ui as a kit (double styling system); Mantine/Chakra/Ant (own styling engines, fight DaisyUI); Base UI (revisit if Radix stagnates); Headless UI (narrower, slower); Lexical/Quill/BlockNote/Novel (wrong fit, see above); TanStack Form (boilerplate without payoff); TanStack Query/SWR (fam-mail's API surface is small; `usePostcard` + fetch wrappers suffice — revisit only if server-state grows); @dnd-kit, vaul, react-table, formik (no use case); CSS-in-JS of any kind.

## AGENTS.md convention changes to apply

1. Replace "Controlled inputs in the wizard (no react-hook-form in this codebase)" with: "react-hook-form + zod is the standard for multi-field forms (address forms); plain controlled inputs remain fine for 1–2-field forms. Zod address schemas should mirror backend validation."
2. Add under Code conventions: "UI layering: DaisyUI for styled primitives and theme tokens; `radix-ui` headless primitives for dialogs/popovers/menus; never add a second styled component kit."
3. Add: "Message editing uses TipTap 3 constrained to the message HTML contract; editor output is untrusted input — server-side DOMPurify (backend `htmlSanitizer.ts`) is the only sanitization authority."
4. Add: "File uploads go through react-dropzone + `imageProcessing.ts` validation — do not hand-roll drag/drop or FileReader plumbing."
5. Add: "Destructive actions use `ConfirmDialog` (radix-ui AlertDialog); feedback uses sonner toasts — no `window.confirm`, no per-page error banners."

## References

- DaisyUI 5 release notes (Tailwind 4 requirement): daisyui.com/docs/v5
- shadcn/ui changelog — Base UI default (Jul 2026), unified radix-ui (Feb 2026): ui.shadcn.com/docs/changelog
- TipTap 3.0 stable / StarterKit contents: tiptap.dev/blog/release-notes/tiptap-3-0-is-stable; @tiptap/react 3.30.x on npm
- @tiptap/markdown: tiptap.dev/docs/editor/markdown; TextStyle/Color span output: tiptap.dev/docs/editor/extensions/functionality/color
- react-hook-form 7.87.0 (~60M weekly): npmjs.com/package/react-hook-form; 2026 comparison: pkgpulse.com TanStack Form vs RHF vs Conform
- sonner 2.0.8 (MIT, ~48M weekly): npmjs.com/package/sonner
- react-dropzone 20.1.1 (Aug 2026, Snyk "healthy"): security.snyk.io/package/npm/react-dropzone
- Tailwind v4 requirements (Vite ^5.2 peer, Node 20+): tailwindcss.com/blog/tailwindcss-v4; npmjs.com/package/@tailwindcss/vite
