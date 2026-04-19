# OpenCode layout for fam-mail

OpenCode reads **project instructions from the repo root** `AGENTS.md` (see `opencode.json` → `instructions`). **Claude Code** uses root `CLAUDE.md`, which imports `@AGENTS.md`. Shared behavior should be edited in **`AGENTS.md`** once.

## Quick start

```bash
cd /path/to/fam-mail
opencode   # TUI with configured provider/model
```

## Configuration

| File | Purpose |
|------|---------|
| `opencode.json` | Models, providers, permissions, compaction, watcher ignores, agent definitions |
| `AGENTS.md` | Portable instructions for all agent tools |
| `.claude/rules/*.md` | Path-scoped rules (also used by Claude Code) |
| `.claude/skills/*/SKILL.md` | On-demand skills (Claude Code; OpenCode may surface similarly) |
| `.claude/nightshift.yaml` | NightShift orchestrator (Pi + Z.ai) |

## Slash commands

Custom commands live in `.opencode/commands/`:

| Command | File |
|---------|------|
| `/triage` | `triage.md` |
| `/implement` | `implement.md` |
| `/qa` | `qa.md` |
| `/fix-ci` | `fix-ci.md` |
| `/review` | `review.md` |

## Agents

Subagent markdown lives in `.opencode/agents/` (OpenCode-specific personas). Use **Tab** to switch primary agents where supported; `@agent` to invoke subagents.

| Agent | Role |
|-------|------|
| `build` | Primary development (prompt: `.claude/opencode-build-prompt.md`) |
| `plan` | Read-only planning |
| `triage` | Issue discovery |
| `implementer` | Issue-driven implementation |
| `reviewer` | PR review |
| `qa` | QA pass |
| `vision` | Image / UI analysis (requires vision MCP when model lacks vision) |

## Troubleshooting

### Slow models

`opencode.json` sets long HTTP timeouts for GLM-class models. Switch to a smaller/faster model in the TUI if latency is painful.

### Rate limiting (429)

Wait briefly and retry; provider plans often throttle concurrent requests.

### Vision

Configure the Z.ai MCP / vision tools in your environment when using the `vision` agent; global OpenCode config may live under `~/.config/opencode/`.
