# Feature Board — 30 Iterations

Working log for the 30-iteration enhancement run (Sept 2026). Each feature ships
on its own branch, merged to `main` only when lint, tests, and build pass.
Inspiration: `docs/research-oss-comforts.md` (single-maintainer OSS study).

| # | Branch | Feature | Category | Status |
|---|--------|---------|----------|--------|
| 0 | feat/00-feature-board | Public feature board + QA scripts | dx | ✅ |
| 1 | feat/01-qa-script | One-command `pnpm qa` (lint+test+build all) | dx | ✅ |
| 2 | feat/02-readme-polish | README docs index: agent API, ADRs, board, support | docs | ✅ |
| 3 | feat/03-changelog-backfill | CHANGELOG backfill of the last releases | docs | ✅ |
| 4 | feat/04-troubleshooting | Self-hoster troubleshooting guide | docs | ✅ |
| 5 | feat/05-env-reference | Environment variable reference | docs | ✅ |
| 6 | feat/06-backup-script | SQLite-safe backup script with retention | ops | ✅ |
| 7 | feat/07-graceful-shutdown | SIGTERM-safe shutdown, DB close | ops | ✅ |
| 8 | feat/08-health-version | /api/health reports the real app version | ops | ✅ |
| 9 | feat/09-dependabot | Weekly Dependabot (pnpm + Actions, grouped) | ops | ✅ |
| 10 | feat/10-schedule-ui | Schedule-for-later UI on the review step | product | ✅ |
| 11 | feat/11-editorconfig | .editorconfig + OSS research doc | dx | ✅ |
| 12 | feat/12-version-footer | Version footer from /api/health | product | ✅ |
| 13 | feat/13-message-templates | Occasion templates in the editor | product | ✅ |
| 14 | feat/14-draft-autosave | Debounced autosave + saved indicator | product | ✅ |
| 15 | feat/15-recent-recipients | Recent-recipient quick-pick chips | product | ✅ |
| 16 | feat/16-export-draft | Draft JSON export (data portability) | product | ✅ |
| 17 | feat/17-address-preflight | Client-side postal/state preflight | product | ✅ |
| 18 | feat/18-shortcuts | Arrow step nav + Cmd/Ctrl+Enter send | product | ✅ |
| 19 | feat/19-char-counter | Word count + near-limit counter state | product | ✅ |
| 20 | feat/20-honesty | "Honest limits & alternatives" README section | docs | ✅ |
| 21 | feat/21-upgrading | UPGRADING.md (backup → pull → restart) | docs | ✅ |
| 22 | feat/22-dark-mode | Dark mode: theme + OS default + toggle | product | ✅ |
| 23 | feat/23-history | Postcard history page + JWT list route | product | ✅ |
| 24 | feat/24-a11y | Skip link, main landmark, focus-visible ring | a11y | ✅ |
| 25 | feat/25-photo-meta | Photo filename/size chip | product | ✅ |
| 26 | feat/26-scheduled-badge | Scheduled-date badge on draft cards | product | ✅ |
| 27 | feat/27-api-examples | Copy-paste API usage examples | docs | ✅ |
| 28 | feat/28-support | SUPPORT.md with expectations | docs | ✅ |
| 29 | feat/29-contributing-refresh | CONTRIBUTING: commands + conventions | docs | ✅ |
| 30 | feat/30-release-1-1-0 | v1.1.0 release: versions, changelog, board | release | ✅ |
