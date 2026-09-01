# Support

Fam-mail is a single-maintainer project — support is best-effort and community-first.

## Where to ask

1. **Troubleshooting first:** [docs/troubleshooting.md](docs/troubleshooting.md) covers the most common self-hosting issues (startup failures, PostGrid modes, agent API keys, dark-mode rendering).
2. **GitHub Issues:** [open an issue](https://github.com/NickLewanowicz/fam-mail/issues/new/choose) with:
   - your deploy style (Docker Compose / from source)
   - the output of `curl -s http://localhost:8484/api/health`
   - relevant `.env` lines with secrets redacted
   - what you expected vs what happened
3. **Security issues:** do NOT open a public issue — see [SECURITY.md](SECURITY.md).

## What "best-effort" means

- Bug reports with the info above usually get a response within a week.
- Feature requests are triaged against the [feature board](docs/FEATURES.md);
  small, well-scoped PRs are the fastest path to a "yes".
- This is free, as-in free time. Rudeness gets closed.
