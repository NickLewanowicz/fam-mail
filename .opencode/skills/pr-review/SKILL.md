---
name: pr-review
description: Review pull requests for code quality, test coverage, security, and postcard domain correctness
---

## What I Do

Perform thorough code review on pull requests, checking for correctness, security, test coverage, and domain-specific postcard validation requirements.

## When to Use Me

- When reviewing any PR before merge
- When doing a final review before release
- When auditing existing code for quality issues

## Review Process

### Step 1: Understand the PR
```bash
gh pr view <number>
gh pr diff <number>
```

### Step 2: Check CI Status
```bash
gh pr checks <number>
```
If CI is failing, flag as blocking.

### Step 3: Review Changes
For each changed file, check:

#### Code Quality
- TypeScript types are precise (avoid `any`)
- Functions are focused, well-named, small
- Error handling is comprehensive
- No debug artifacts (console.log, commented code)
- Consistent with existing patterns

#### Security
- All user inputs are validated and sanitized
- No SQL injection (use parameterized queries)
- No XSS vectors (sanitize HTML output)
- No secrets in source code
- Auth middleware on protected routes

#### Postcard Domain
If PR touches postcard flow:
- Address validation covers all fields
- Image format/size constraints enforced
- Message content is sanitized
- Return address is always present
- PostGrid API payload matches schema

#### Tests
- New code has corresponding tests
- Edge cases are covered
- Mocks are realistic
- Test names describe behavior

### Step 4: Post Review
```bash
gh pr review <number> --approve --body "LGTM..."
# or
gh pr review <number> --request-changes --body "Changes needed..."
# or
gh pr review <number> --comment --body "Some suggestions..."
```

## Review Comment Format
```
### Summary
[One-line verdict]

### Critical Issues (must fix)
- [ ] Issue 1 — file:line — explanation

### Suggestions (optional improvements)
- [ ] Suggestion 1 — file:line — explanation

### What's Good
- Positive note 1
```
