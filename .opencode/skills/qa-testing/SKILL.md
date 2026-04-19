---
name: qa-testing
description: Run comprehensive QA including unit tests, linting, build verification, and visual QA for fam-mail
---

## What I Do

Execute a full QA pass on the fam-mail codebase, covering static analysis, unit tests, build verification, and visual inspection.

## When to Use Me

- Before creating a release
- After a large refactoring
- To validate CI fixes
- For periodic quality audits

## QA Runbook

### 1. Backend Tests
```bash
cd backend && pnpm test 2>&1
```
Expected: All tests pass. Check for skipped tests that shouldn't be skipped.

### 2. Frontend Tests
```bash
cd frontend && pnpm test -- --run 2>&1
```
Expected: All tests pass. Check coverage numbers if available.

### 3. Backend Lint
```bash
cd backend && pnpm lint 2>&1
```
Expected: No errors. Warnings are acceptable but should be tracked.

### 4. Frontend Lint
```bash
cd frontend && pnpm lint 2>&1
```
Expected: No errors.

### 5. Backend Build
```bash
cd backend && pnpm build 2>&1
```
Expected: Compiles without errors.

### 6. Frontend Build
```bash
cd frontend && pnpm build 2>&1
```
Expected: Bundles without errors. Check bundle size warnings.

### 7. Type Check (if separate from build)
```bash
cd frontend && npx tsc --noEmit 2>&1
cd backend && npx tsc --noEmit 2>&1
```

### 8. Security Audit
```bash
pnpm audit 2>&1 || true
```
Check for high/critical vulnerabilities.

### 9. Docker Build
```bash
docker build -t fam-mail:qa-test . 2>&1
```
Expected: Image builds successfully.

## Report Template
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

## Blocking Issues
- Issue 1
- Issue 2

## Recommendations
- Recommendation 1
- Recommendation 2

## Overall Verdict: PASS/FAIL
```
