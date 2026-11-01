# Backlog — verified findings awaiting implementation

From the Nov 2026 audit sweep (Dana/architecture, Ren/UX, Sam/packages).
Top items first; each was code-verified during the audit.

## Architecture (Dana)
1. P1: Validate sessions in AuthMiddleware (currently signature-only); stop
   returning tokens in the OIDC callback query string (use the fragment).
2. P1: Drafts list endpoints ship full base64 images — select without
   image_data; add LIMIT; dedicated recent-recipients endpoint.
3. P1: generateFrontHTML (frontend postcardTemplate.ts) hardcodes 6x4 —
   parameterize by size like the backend already does.
4. P1: Rate limits keyed on spoofable X-Forwarded-For — prefer the socket
   address or gate XFF behind TRUST_PROXY.
5. P2: Global error handler (try/catch in handleRequest + Bun serve error
   option) so unhandled throws still get CORS/security headers.
6. P2: Draft PUT accepts client-supplied state/scheduledFor (state-machine
   bypass); treat null as clear; whitelist fields.
7. P2: Session expiry format mismatch (ISO vs SQLite datetime) and refresh
   flow never checks expires_at.
8. P2: Standardize API envelopes ({data} vs {drafts}); payload cap for
   draft writes.

## UX (Ren)
1. Message editor should open as a bottom sheet on mobile (currently
   in-card, ~200px wide on phones).
2. Templates belong in a chip row, not a native <select>.
3. Dashboard/History empty states need illustration + clay CTA treatment.
4. Success screen: animate the card away on a dark overlay.

## Packages (Sam)
1. Upgrade Vite 5→7 + Vitest 1→4 (Vite 5 is EOL) and ESLint 8→9 flat config.
2. Tailwind 3→4 migration (ADR 0001 Phase 2; also deletes postcss/autoprefixer).
3. jose v5→v6 dedupe (openid-client pulls v6 already).
4. Consolidate PostcardSize/CountryCode type homes into postcardTemplate only.
