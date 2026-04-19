---
description: Run comprehensive QA - tests, lint, build, and visual checks
agent: qa
subtask: true
---

Run a full QA pass on the fam-mail codebase. $ARGUMENTS

Execute:
1. Backend and frontend unit tests
2. Backend and frontend lint
3. Backend and frontend build
4. Security audit
5. Docker build verification (if requested)
6. Visual QA via @vision (if requested)

Generate a structured QA report with pass/fail status for each check and list any blocking issues.
