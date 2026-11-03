# FAQ

**Can I use it without a PostGrid account?**
Yes — set `POSTGRID_MOCK=true`. Everything works and nothing is mailed.

**What does it cost to send a card?**
Whatever PostGrid charges (roughly $0.36+ per US postcard plus printing).
Fam-mail itself is free; test mode is free too.

**Can several people use one instance?**
Yes — everyone signs in through OIDC and sees only their own drafts and
history. PostGrid mode switching is restricted to `ADMIN_EMAILS`.

**Does the email-to-postcard thing still work?**
The IMAP/LLM pipeline is paused (code remains, disabled unless `IMAP_HOST`
is set). The web UI and agent API are the supported paths.

**How do I get my data out?**
Export any draft as JSON from the dashboard, or copy the SQLite file —
it's your machine. See `scripts/backup.sh`.
