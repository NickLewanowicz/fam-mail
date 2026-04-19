---
name: qa-testing
description: Run comprehensive QA including unit tests, linting, build verification, and visual QA for fam-mail
---

## What I do

Execute a full QA pass on the fam-mail codebase: static analysis, unit tests, builds, and optional container checks.

## When to use

- Before a release or large refactor
- After CI or agent changes to the pipeline
- Periodic quality audits

## QA runbook

### 1. Backend tests

```bash
cd backend && pnpm test 2>&1
```

Expect all tests to pass; note unintended skips.

### 2. Frontend tests

```bash
cd frontend && npx vitest run 2>&1
```

Use **`vitest run`** (one-shot). Watch mode can hang after completion due to jsdom timer leaks.

### 3. Backend lint

```bash
cd backend && pnpm lint 2>&1
```

### 4. Frontend lint

```bash
cd frontend && pnpm lint 2>&1
```

### 5. Backend build

```bash
cd backend && pnpm build 2>&1
```

### 6. Frontend build

```bash
cd frontend && pnpm build 2>&1
```

### 7. Typecheck (if not fully covered by build)

```bash
cd frontend && npx tsc --noEmit 2>&1
cd backend && npx tsc --noEmit 2>&1
```

### 8. Security audit

```bash
cd /path/to/fam-mail && pnpm audit 2>&1 || true
```

### 9. Docker image (optional)

```bash
cd /path/to/fam-mail && docker build -t fam-mail:qa-test . 2>&1
```

## Report template

```
# QA Report - YYYY-MM-DD

## Results
| Check | Status | Details |
|-------|--------|---------|
| Backend Tests | PASS/FAIL | X/Y passing |
| Frontend Tests | PASS/FAIL | X/Y passing |
| Backend Lint | PASS/FAIL | N errors |
| Frontend Lint | PASS/FAIL | N errors |
| Backend Build | PASS/FAIL | |
| Frontend Build | PASS/FAIL | |
| Docker Build | PASS/FAIL | |
| Security Audit | PASS/WARN/FAIL | N vulnerabilities |

## Blocking issues
- …

## Recommendations
- …

## Overall verdict: PASS/FAIL
```
