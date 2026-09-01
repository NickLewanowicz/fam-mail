# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.1.0] — 2026-09-01

### Added
- Postcard history page (`/history`) with status chips
- Schedule-for-later UI wired to the background dispatcher
- Occasion templates in the message editor
- Recent-recipient quick-pick on the address step
- Draft autosave with a polite saved indicator
- Draft JSON export; keyboard shortcuts (arrow nav, Cmd/Ctrl+Enter to send)
- Word count + near-limit counter state; dark mode toggle

### Fixed
- Return address, image fronts, print canvas sizing, document-wrapper sanitization
- Dark-mode form theming (data-theme root fix); toolbar selection loss
- Stepper skip gating; editor overlay stuck across steps

### Changed
- ADR 0001 library strategy: sonner, radix-ui, react-dropzone adopted; ~1,200 LOC dead code removed

## [1.2.0] — 2026-09-01

### Added
- 404 page, per-route tab titles, dark mode toggle, reduced-motion support
- Postcard history: copy-address, send-again, load-more pagination
- Draft autosave, search, JSON export, scheduled-date badges
- Occasion templates, keyboard shortcuts, address preflight validation
- Ops: backup script, graceful shutdown, version in /api/health, Dependabot, e2e in CI

### Docs
- Troubleshooting, environment reference, FAQ, UPGRADING, SUPPORT, API examples
- ADR 0001: frontend library strategy (sonner, radix-ui, react-dropzone, TipTap planned)

## [Unreleased]

### Added
- Agent API (`/api/v1`) with API-key auth for machine integrations (Hermes, OpenClaw)
- Scheduled postcards now dispatch automatically when their send date arrives
- Rich text messages: underline, strikethrough, and text colors that print
- Size-accurate preview for 6x4 / 9x6 / 11x6 cards

### Fixed
- Return address is now actually sent to PostGrid (was validated then dropped)
- Uploaded photos are used as front artwork (were silently ignored, draft path too)
- Card canvas dimensions now match the selected card size at print time
- PostGrid mode toggle no longer usable when ADMIN_EMAILS is unset (fail closed)
- Toolbar formatting no longer clears the text selection
- Address form renders correctly under OS dark mode

### Changed
- Adopted frontend library strategy (ADR 0001): sonner toasts, radix-ui dialogs,
  react-dropzone uploads; removed ~1,200 LOC of dead/duplicated code

### Added
- Multi-step postcard creation wizard (Country → Photo → Message → Address → Review)
- Interactive postcard preview with dynamic safe zones (US, CA, UK)
- Draft save/load system with SQLite persistence
- PostGrid test/live mode toggle
- OIDC authentication via Pocket ID
- Dev mode for local development without OIDC
- Markdown support in postcard messages with WYSIWYG editor
- Country-specific address validation (US, CA, GB)
- Docker single-container deployment
- Inbound email webhook for email-to-postcard pipeline
- Postcard size selection (6x4, 9x6, 11x6) integrated throughout wizard and backend
- Return address collection in postcard wizard
- WebP image format support
- Rate limiting on submission and webhook endpoints
- TTL-based expiry for OIDC state store to prevent memory leak
- Periodic session cleanup
- Token rotation via /api/auth/refresh endpoint
- AuthFetch wrapper with silent token renewal (401→refresh→retry)

### Changed
- Centralized SMTP configuration in getConfig() module
- Moved frontend API base URL to VITE_API_URL environment variable
- Consolidated ALLOWED_IMAGE_TYPES constant for consistent validation
- Standardized size format to PostGrid format across codebase

### Security
- JWT-based session management with refresh tokens
- Centralized security headers and CORS middleware
- CSP hardened (removed unsafe-inline from script-src and style-src)
- Rejected unauthenticated webhook requests when WEBHOOK_SECRET is empty
- Added JWT secret validation
- Restricted POST /api/postgrid/mode to admin users only
- Sanitized frontHTML/backHTML before sending to PostGrid
- Minimal health response to prevent info disclosure
- Used Buffer.from for base64 encoding to prevent stack overflow on large attachments
- Made IMAP config optional so server starts without IMAP env vars
- Applied security headers to static file responses in production

### Fixed
- Eliminated all `no-explicit-any` lint warnings and upgraded rule to error
- Fixed React act() warnings in test files
- Replaced hardcoded colors with DaisyUI theme variables
- Added section-level ErrorBoundary wrappers to prevent full app crash
- Fixed flaky backend CA address test
- Updated frontend test for React.lazy compatibility
- Implemented frontend code splitting to reduce initial bundle size
- Removed dev-only ModalTestPage from production code
- Added confirmation dialog before draft deletion
- Fixed Dockerfile to use Node/pnpm for install stage on constrained networks
- Wired country-specific safe zones into PostcardPreview
- Fixed TTL expiry test for OIDC state store eviction
- Fixed pass null instead of undefined to clear scheduledFor in cancelSchedule()
- Wired frontend authentication with OIDC login/callback flow
- Consolidated agent config into modern .claude structure
- Removed stale CHANGELOG_AGENT.md dev artifact
- Replaced console.log statements with structured logger in backend

### Removed
- Unused helmet package (security headers now custom)
