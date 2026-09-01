# OSS "Creature Comforts" Research for fam-mail

Research into how beloved single-maintainer self-hosted projects (linkding, IT-Tools, Uptime Kuma, Homebox, Karakeep, Stirling-PDF, Miniflux, FreshRSS, Kimai, Omni-Tools) earn user trust. Sources fetched Sept 2026. fam-mail already has CI badge, screenshots, CHANGELOG, CONTRIBUTING, troubleshooting, issue/PR templates, and a compose healthcheck — ideas below target the gaps.

**Effort:** XS <30min · S 30–90min · M ~2h

---

## 1. Repo/docs comforts

1. **Docker + release badges row** — Add Docker pulls, release-version, and Stars badges beside CI/License. *like Homebox's dense badge row (CI, releases, translation, community)* — **XS**
2. **"Try it without PostGrid" demo note** — A short README block showing `POSTGRID_MOCK=true` so users can click through the wizard risk-free. *like IT-Tools/linkding leading with "Try it!" demo links* — **S**
3. **Environment variable reference table** — One table in DEPLOYMENT.md: name, default, required?, purpose. Kills the #1 self-hosted support question. *like Miniflux's dedicated configuration doc* — **S**
4. **FAQ page** — 8–10 Q&As (costs per card, data location, OIDC setup, IMAP status). *like Miniflux's FAQ docs page* — **S**
5. **UPGRADING.md** — Version-by-version upgrade notes (env renames, DB migrations). *like Kimai's UPGRADING-1.md/UPGRADING-3.md guides* — **S**
6. **Backup & restore guide** — Document SQLite file location, safe `.backup` procedure, and a restore walkthrough. *like Stirling-PDF's DATABASE.md and Homebox's "easy to backup" portability principle* — **S**
7. **Alternatives section** — Honest list of similar tools (Postcard services, Invoiced-style senders). Counterintuitively builds trust. *like Karakeep's Alternatives section listing Pocket, Wallabag, Linkwarden* — **XS**
8. **Motivation / "why fam-mail" blurb** — 3 sentences on why it exists (family postcards, not spam). *like Uptime Kuma's candid Motivation section and Karakeep's "About the name"* — **XS**
9. **Support boundaries note** — "Questions → GitHub Discussions/issues, not email" with a Reddit/Discord channel if desired. *like Uptime Kuma's explicit "please don't email me" support policy* — **XS**
10. **Docs index** — docs/README.md linking API, DEPLOYMENT, troubleshooting, ARCHITECTURE, plans so the docs folder is navigable. *like FreshRSS's split user/admin/developer guide entry points* — **XS**
11. **Roadmap pointer** — Small README section linking to GitHub milestones/board instead of duplicating lists. *like IT-Tools' roadmap that defers to GitHub Issues* — **XS**
12. **CODEOWNERS** — One-line file so PRs auto-request the maintainer. *like Omni-Tools' CODEOWNERS* — **XS**

## 2. Ops comforts

13. **`/api/version` endpoint + footer version** — Return `{version, commit}` from build args; show in UI footer for bug reports. *like Stirling-PDF surfacing app version; Miniflux's version/health endpoints* — **S**
14. **Backup script + schedule** — `scripts/backup.sh` using `sqlite3 .backup` to a timestamped file; compose comment showing a cron container. *like Stirling-PDF's documented backup flow* — **S**
15. **One-command update path** — Document `docker compose pull && docker compose up -d` with a data-safety note at top. *like Uptime Kuma's dedicated "How to Update" wiki page* — **XS**
16. **Graceful shutdown** — Handle SIGTERM: stop accepting requests, finish in-flight PostGrid calls, close DB. *like Miniflux's Twelve-Factor/`sd_notify` operational hygiene* — **S**
17. **Log hygiene** — Structured leveled logs, no secrets/addresses in logs; keep `logs/` gitignored. *like Omni-Tools' commitlint/hooks rigor applied to runtime output* — **S**
18. **Versioned image tags on ghcr** — Publish `v1.x` tags (not just `latest`) to ghcr alongside Docker Hub. *like IT-Tools publishing to both Docker Hub and ghcr* — **M**
19. **Release automation with Changesets** — Batch intentional releases with generated CHANGELOG entries and tagged GitHub Releases; no auto-publish on every merge. *like IT-Tools' `.versionrc`+CHANGELOG flow; Changesets is the 2026 solo-maintainer consensus over semantic-release* — **S**
20. **Hardened compose example** — Second compose snippet with `TZ`, pinned version tag, `pull_policy`, uid guidance. *like Homebox's security-conscious quick start (openssl pepper, chmod 400, rootless notes)* — **S**
21. **Healthcheck JSON upgrade** — `/api/health` returns `{status, version, db: ok}` so compose + uptime monitors see real state. *like Uptime Kuma's rich per-monitor status payloads* — **XS**
22. **Scalar/OpenAPI-rendered API page** — Serve API.md as an interactive reference or generate from JSDoc. *like Stirling-PDF's Scalar-hosted API reference* — **M**

## 3. Product comforts

23. **Draft autosave (localStorage)** — Persist wizard state per draft every few seconds with a "restored unsaved changes" toast. *like Karakeep's offline-first clients; standard form autosave* — **S**
24. **Recent recipients quick-pick** — Dropdown of last-sent contacts with one-tap address fill. *like Kimai's recent projects/tags for fast re-entry* — **S**
25. **Postcard templates** — Birthday/thank-you/holiday presets (message + occasion tag) on the wizard start. *like IT-Tools' per-tool scaffolding making small features cheap* — **M**
26. **CSV import of contacts** — Map name/address columns, validate postal rules, show per-row errors. *like linkding's Netscape HTML import and Karakeep's Chrome/Pocket importers* — **M**
27. **Full data export** — One click: ZIP of SQLite dump + uploaded images for portability peace of mind. *like linkding's export and Homebox's "easy to backup" promise* — **M**
28. **Keyboard shortcuts** — ⌘/Ctrl+Enter to save/send, ←/→ between wizard steps, `?` shortcut cheatsheet overlay. *like Miniflux's dedicated keyboard-shortcuts docs page* — **S**
29. **Dark mode** — DaisyUI 5 theme toggle with system-preference default. *like Karakeep's dark mode; Stirling's `home-light.png` implies theming* — **S**
30. **Usage & cost visibility** — Dashboard widget: cards sent this month, PostGrid credits consumed, test vs live. *like Kimai's budgets/rates per project* — **M**
31. **Sent-history/audit page** — Table of sent cards with PostGrid status, cost, thumbnails; filterable. *like Stirling-PDF's auditing; Uptime Kuma's ping charts* — **M**
32. **API keys management UI** — Create/revoke/rename Agent API keys with last-used timestamps in settings. *like Miniflux's per-user API token management* — **M**
33. **Shareable preview image** — "Download/share" renders the composed card front as a PNG for social or recipient teaser. *like IT-Tools' shareable URL state philosophy* — **M**
34. **PWA installability** — Manifest + icons so fam-mail installs to a phone home screen. *like linkding's PWA support* — **S**
35. **i18n prep** — Extract UI strings to a single locale module + report table; no translation yet. *like Omni-Tools' i18n status table and FreshRSS's 20+ language progress table* — **M**
36. **Accessibility pass** — Labeled inputs, visible focus rings, aria on wizard steps, color-contrast check. *like linkding's pytest/ruff/prettier quality rigor, applied to a11y* — **S**
37. **Helpful empty states** — Dashboard empty state with "Create your first postcard" illustration + CTA. *like Uptime Kuma's friendly onboarding copy (🥔 included)* — **XS**

## 4. Developer comforts

38. **One-command QA script** — `pnpm qa` running lint+tests both packages (wrap existing `scripts/ci-local.sh`). *like linkding's `make test`/`make lint` Makefile* — **XS**
39. **Devcontainer** — Bun+Node image with pnpm preinstalled and ports forwarded. *like linkding, Miniflux, and Homebox all shipping devcontainers* — **S**
40. **`.editorconfig` + `.nvmrc`** — Pin formatting (2-space, UTF-8, LF) and Node version for contributors. *like Omni-Tools' EditorConfig and IT-Tools' `.nvmrc`* — **XS**
41. **Renovate config** — Weekly dependency updates, grouped minor/patch, automerge dev-deps. *like IT-Tools' renovate.json* — **XS**
42. **Codespell/typos CI job** — Catch misspellings in docs and strings before release. *common across surveyed repos (Omni-Tools hooks culture)* — **XS**
43. **Coverage badge + job** — Emit `bun test --coverage` in CI, badge in README. *like Homebox/IT-Tools CI badge rows* — **S**
44. **Commitlint + husky** — Conventional-commit enforcement for clean auto-changelogs later. *like Omni-Tools' commitlint+husky setup* — **XS**

---

## Top 15 by value ÷ effort

| # | Idea | Why it wins | Effort |
|---|------|-------------|--------|
| 1 | #13 Version endpoint + footer | Trivial, unblocks every future bug report and update check | S |
| 2 | #28 Keyboard shortcuts (⌘+Enter send) | High perceived polish for tiny cost | S |
| 3 | #40 `.editorconfig` + `.nvmrc` | 10 minutes, permanent contributor hygiene | XS |
| 4 | #41 Renovate | Free security currency for a solo maintainer | XS |
| 5 | #3 Env var reference table | Removes the top self-hosted friction; low writing cost | S |
| 6 | #21 Healthcheck JSON upgrade | Makes compose + uptime tools genuinely informative | XS |
| 7 | #15 One-command update doc | Upgrade fear is the #1 self-hosted churn cause | XS |
| 8 | #29 Dark mode | DaisyUI 5 makes this nearly free; users notice instantly | S |
| 9 | #23 Draft autosave | Protects real user work (money-adjacent data) | S |
| 10 | #6 Backup & restore guide | Data-loss insurance doc; pure writing | S |
| 11 | #24 Recent recipients | Daily-use convenience for the core loop | S |
| 12 | #14 Backup script | Turns doc #10 into a runnable comfort | S |
| 13 | #5 UPGRADING.md | Cheap now (only v1 exists), priceless at v2 | S |
| 14 | #37 Helpful empty states | First-run impressions; near-zero code | XS |
| 15 | #19 Changesets releases | Intentional, human-readable releases build long-term trust | S |

*Honorable mentions:* #38 one-command QA (already half-built in `scripts/ci-local.sh`), #1 badges, #7 alternatives section — all XS do-anytime fillers.

**Sources:** github.com/sissbruecker/linkding · github.com/CorentinTh/it-tools · github.com/louislam/uptime-kuma · github.com/sysadminsmedia/homebox · github.com/karakeep-app/karakeep · github.com/Stirling-Tools/Stirling-PDF · github.com/miniflux/v2 · github.com/FreshRSS/FreshRSS · github.com/kimai/kimai · github.com/iib0011/omni-tools · github.com/RichardLitt/standard-readme · changesets-vs-semantic-release comparisons (pkgpulse.com, tonyward.dev, swyx.io)
