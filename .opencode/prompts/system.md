## Fam-Mail Project Context

Fam-mail is a web application that lets users send physical postcards to friends and family. It integrates with PostGrid for print-and-mail fulfillment.

### Current State (Beta 1.0.0)
- The IMAP/LLM email-to-postcard pipeline is PAUSED
- Focus is on the web UI postcard builder and API
- Auth (OIDC + JWT) backend routes exist but frontend is not wired
- Draft management backend exists but frontend is not wired
- CI is failing on main (last 4 runs failed)
- **QA Status**: 313 tests pass (153 backend + 160 frontend), frontend/backend lint clean, builds pass
- **Tracked Issues**: See GitHub project board for open issues

### Priorities
1. Fix CI pipeline
2. Stabilize postcard validation and PostGrid integration
3. Wire frontend auth and drafts
4. Comprehensive test coverage
5. E2E test suite

### Testing Requirements
- Use pnpm, never npm or yarn
- Run tests with `pnpm test` (uses bun test for backend, vitest for frontend)
- Run lint with `pnpm lint`
- Never run pnpm dev to verify - rely on tests and linting
- All postcard validation edge cases must have test coverage

### Execution Guidelines
- When fixing multiple independent issues, use the task tool to delegate to subagents in parallel
- Always verify fixes by running tests and lint after changes
- For bash commands, always set the working directory explicitly (use absolute paths or `cd /path && cmd`)
- When permissions block a bash command, try rephrasing (e.g., `cd /path && pnpm audit` instead of just `pnpm audit`)

### Vision Delegation
GLM 5.1 does not have native vision. For any image/UI analysis:
- Use the `zai-mcp-server` MCP which provides GLM-4.6V vision capabilities
- Available tools: `image_analysis`, `ui_to_artifact`, `extract_text_from_screenshot`, `diagnose_error_screenshot`, `ui_diff_check`
- For UI QA, take screenshots and analyze with these tools
- For code-based visual QA (no screenshots), analyze component source code directly for accessibility and theming issues
