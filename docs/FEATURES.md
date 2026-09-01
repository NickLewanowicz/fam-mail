# Feature Board — 30 Iterations

Working log for the 30-iteration enhancement run (Sept 2026). Each feature ships
on its own branch, merged to `main` only when lint, tests, and build pass.
Inspiration: `docs/research-oss-comforts.md` (single-maintainer OSS study).

| # | Branch | Feature | Category | Status |
|---|--------|---------|----------|--------|
| 0 | feat/00-feature-board | Public feature board + QA scripts | dx | ✅ |
| 1 | feat/01-qa-script | One-command `pnpm qa` (lint+test+build all) | dx | ⏳ |
| 2 | feat/02-readme-polish | README badges, docs index, quick start polish | docs | ⏳ |
| 3 | feat/03-contributing | CONTRIBUTING.md with ADR + convention links | docs | ⏳ |
| 4 | feat/04-changelog | CHANGELOG.md (Keep a Changelog) + version bump | docs | ⏳ |
| 5 | feat/05-troubleshooting | docs/troubleshooting.md for self-hosters | docs | ⏳ |
| 6 | feat/06-env-reference | docs/environment.md full env var reference | docs | ⏳ |
| 7 | feat/07-backup-script | scripts/backup.sh + restore docs | ops | ⏳ |
| 8 | feat/08-graceful-shutdown | SIGTERM-safe shutdown, DB close | ops | ⏳ |
| 9 | feat/09-health-version | /api/health reports real app version | ops | ⏳ |
| 10 | feat/10-dependabot | Dependabot for pnpm + GitHub Actions | ops | ⏳ |
| 11–30 | — | Reserved: product comforts from OSS research (templates, schedule UI, history, autosave, export, shortcuts, a11y…) | product | ⏳ |
