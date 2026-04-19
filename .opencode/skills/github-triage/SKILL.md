---
name: github-triage
description: Triage fam-mail codebase, identify issues, and create GitHub issues on the Fammail Features project board
---

## What I Do

Systematically analyze the fam-mail codebase to find bugs, missing features, tech debt, and testing gaps. Create well-structured GitHub issues with proper labels, priority, and sizing.

## When to Use Me

- After a failed CI run to triage failures into issues
- Periodically to audit code quality and identify tech debt
- When starting a new development phase to populate the backlog
- After receiving user feedback to create actionable issues

## Process

### Step 1: Run diagnostics
```bash
cd backend && pnpm test 2>&1 | tail -50
cd frontend && pnpm test 2>&1 | tail -50
cd backend && pnpm lint 2>&1 | tail -30
cd frontend && pnpm lint 2>&1 | tail -30
```

### Step 2: Check CI status
```bash
gh run list --limit 5
gh run view <latest-run-id> --log-failed 2>&1 | tail -100
```

### Step 3: Review PROGRESS.md for incomplete items
Read PROGRESS.md and cross-reference with actual code state.

### Step 4: Search for common issues
```bash
rg "TODO|FIXME|HACK|XXX" backend/src/ frontend/src/
rg "any" --type ts backend/src/ -l  # loose typing
rg "console\.(log|warn|error)" backend/src/ frontend/src/ -l  # debug artifacts
```

### Step 5: Create issues
For each finding, create a GitHub issue:
```bash
gh issue create \
  --title "[Bug]: Description" \
  --label "bug" \
  --body "## Description\n\n## Steps to Reproduce\n\n## Expected Behavior\n\n## Evidence\n\n## Acceptance Criteria\n- [ ] Fix applied\n- [ ] Tests added\n- [ ] CI passes" \
  --project "Fammail Features"
```

### Step 6: Set project fields
After creating issues, set Priority and Size on the project board:
```bash
# Get item ID from project
gh project item-list 4 --owner NickLewanowicz --format json
# Then update fields as needed
```

## Labels to Use
- `bug` — Something isn't working
- `enhancement` — New feature or request
- `documentation` — Docs improvements
- `good first issue` — Good for newcomers
- `help wanted` — Extra attention needed

## Quality Checklist
- [ ] Issue title is specific and actionable
- [ ] Description includes evidence (error output, file refs)
- [ ] Priority reflects actual impact
- [ ] Size estimate is realistic
- [ ] No duplicate of existing issue
