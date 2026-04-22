# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
