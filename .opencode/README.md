# OpenCode Agent Setup for fam-mail

## Quick Start

```bash
cd /path/to/fam-mail
opencode   # starts TUI with GLM 5.1
```

## Available Commands

| Command | Description |
|---------|-------------|
| `/triage` | Scan codebase for issues and create GitHub issues |
| `/implement <issue#>` | Implement a GitHub issue with branch + PR |
| `/qa` | Run full QA pass (tests, lint, build) |
| `/fix-ci` | Diagnose and fix CI failures |
| `/review <pr#>` | Review a pull request |

## Available Agents

Use `Tab` to switch primary agents, `@agent` to invoke subagents.

| Agent | Mode | Purpose |
|-------|------|---------|
| **build** | primary | Full development with all tools |
| **plan** | primary | Read-only analysis and planning |
| **triage** | subagent | Find issues, create GitHub issues |
| **implementer** | subagent | Implement features from issues |
| **reviewer** | subagent | Review pull requests |
| **qa** | subagent | Run comprehensive QA checks |
| **vision** | subagent | Image/UI analysis via GLM-4.6V |

## Available Skills

Skills are loaded on-demand. The agent will discover and use them automatically.

| Skill | Description |
|-------|-------------|
| `github-triage` | Triage codebase and create GitHub issues |
| `implement-feature` | End-to-end feature implementation workflow |
| `postcard-validation` | PostGrid postcard validation rules |
| `qa-testing` | Comprehensive QA runbook |
| `vision-analysis` | Vision MCP tool usage guide |
| `pr-review` | PR review checklist and process |

## Agentic Development Loop

The system supports a complete feedback loop:

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  /triage    │────>│  GitHub      │────>│  /implement   │
│  Find issues │     │  Issues #4   │     │  Code + test  │
└─────────────┘     └──────────────┘     └───────────────┘
       ^                                        │
       │                                        v
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  /qa        │<────│  /review     │<────│  Pull Request  │
│  Validate   │     │  Code review │     │  gh pr create  │
└─────────────┘     └──────────────┘     └───────────────┘
```

1. **Triage**: `/triage` scans the codebase, creates issues on the project board
2. **Implement**: `/implement 16` picks up an issue, creates a branch, codes, tests
3. **Review**: `/review 1` reviews the PR for quality and correctness
4. **QA**: `/qa` runs full test suite to validate

## Troubleshooting

### GLM 5.1 is slow
GLM 5.1 has higher latency than smaller models. The config sets extended timeouts:
- Request timeout: 600s (10 min)
- Chunk timeout: 120s (2 min)

For faster iteration, switch to `glm-5-turbo` or `glm-4.7-flash`:
```
Tab → select model → zai-coding-plan/glm-4.7-flash
```

### Rate limiting (429 errors)
If you see 429 errors in logs (`~/.local/share/opencode/log/`), wait 60 seconds before retrying. The Z.AI coding plan has rate limits on concurrent requests.

### MCP servers not loading
Check if MCP servers are running:
```bash
opencode debug config | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin).get('mcp',{}), indent=2))"
```

### Vision not working
The Vision MCP (`zai-mcp-server`) requires the `Z_AI_API_KEY` environment variable. It's configured globally in `~/.config/opencode/opencode.json`. Tools available:
- `image_analysis`, `ui_to_artifact`, `extract_text_from_screenshot`
- `diagnose_error_screenshot`, `ui_diff_check`

## Configuration Files

| File | Purpose |
|------|---------|
| `opencode.json` | Project config (model, agents, permissions, timeouts) |
| `.opencode/agents/*.md` | Agent definitions |
| `.opencode/skills/*/SKILL.md` | Skill definitions |
| `.opencode/commands/*.md` | Custom command definitions |
| `.opencode/prompts/*.md` | System prompts |
| `CLAUDE.md` | Project rules (also used by Claude Code) |
