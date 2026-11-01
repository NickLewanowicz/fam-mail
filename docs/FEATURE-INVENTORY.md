# Feature Inventory — Regression Baseline

Every user-facing behavior as of the 1.2.0-era codebase. Before any refactor,
each line must still hold. Verification: the automated suites plus a manual
walkthrough (desktop 1280px, mobile 390px).

## Auth
- OIDC sign-in via any provider; DEV_MODE one-click dev login (dev@fammail.local)
- JWT access/refresh with silent refresh + coalesced 401 retry (authApi)
- Logout destroys the server session

## Dashboard (/)
- Hero + "Create a Postcard" CTA; drafts grid (image, recipient, state chip,
  scheduled 📅 badge, relative updated time, Export JSON, Delete w/ ConfirmDialog)
- Draft search box (name/message); empty states; MOCK/TEST/LIVE mode badge in nav
- Dark-mode toggle (persisted, OS default); version footer from /api/health

## Wizard (/create) — Destination → Photo → Message → Address → Review
1. Destination: US/CA/GB cards; nothing pre-selected; choice advances the step
2. Photo: react-dropzone upload (JPEG/PNG/WebP ≤10MB), drag+click, filename/size
   chip, remove; step unlocks "Write Message"
3. Message: inline editor on the card back — markdown (bold/italic/heading/list/
   quote) + underline/strike + 6-color palette; occasion templates; serif
   13px editor; 500-char limit, word count, near-limit colors; live preview
   renders bold/underline/color on the cream card
4. Address: recipient + optional return address; recent-recipient chips;
   client-side preflight (ZIP/postal/state formats); maxLength caps
5. Review: checklist (photo/message/to/from), mode banner, size selector
   (6x4/9x6/11x6) driving preview aspect + label, schedule-for-later (guarded
   against past dates), Send (⌘/Ctrl+Enter), Save Draft
- Keyboard: ←/→ step nav (prerequisite-gated); steps block jumps past
  unfinished prerequisites; beforeunload guard when card has content

## Backend behavior
- POST /api/postcards: address+image+message validation, sanitization
  (DOMPurify), size-aware print canvases, return address + photo fronts
  actually sent to PostGrid, 413 cap, 5/min rate limit
- Drafts CRUD + publish + schedule (+cancel); dispatcher mails due scheduled
  drafts (30s poll, 15-min failure retry)
- History: JWT GET /api/postcards (+ /api/v1 key-auth variants), body cap
- Agent API: /api/v1/postcards (create/list/get) with API_KEYS
- /api/health with real version; graceful SIGTERM shutdown

## Non-functional
- Dark mode (OS default + toggle), reduced-motion respected, skip-link +
  focus-visible, aria-current nav, toasts (sonner) + ConfirmDialog
- Responsive: desktop + 390px mobile layouts; native-feel mobile editor goal
