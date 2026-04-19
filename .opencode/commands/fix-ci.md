---
description: Diagnose and fix CI pipeline failures
agent: build
---

Fix the CI pipeline. $ARGUMENTS

Steps:
1. Check recent CI runs: `gh run list --limit 5`
2. Get failure logs: `gh run view <id> --log-failed`
3. Reproduce failures locally:
   - `cd backend && pnpm install && pnpm lint && pnpm test && pnpm build`
   - `cd frontend && pnpm install && pnpm lint && pnpm test && pnpm build`
4. Fix the root cause of each failure
5. Validate all checks pass locally
6. Commit with message: `fix(ci): <description>`

Do NOT just suppress errors - fix the underlying issues.
