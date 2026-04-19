@AGENTS.md

## Claude Code specific

- **Imports**: This file loads `@AGENTS.md` from the repository root (same directory). Keep portable guidance in `AGENTS.md`; put Claude-only policy here.
- **Path-scoped rules**: `.claude/rules/` — `testing.md`, `frontend.md`, `backend.md` apply when matching files are in context.
- **Skills**: Use `.claude/skills/` (`qa-testing`, `postcard-validation`) for repeatable checklists instead of pasting long runbooks into chat.
- **NightShift**: Orchestrator config for autonomous runs lives in `.claude/nightshift.yaml` (Pi backend, Z.ai models, QA command bundle).
