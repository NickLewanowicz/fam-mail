# Contributing to Fam Mail

Thank you for your interest in contributing to Fam Mail! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment for all contributors

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/NickLewanowicz/fam-mail.git`
3. Add the upstream remote: `git remote add upstream https://github.com/NickLewanowicz/fam-mail.git`
4. Follow the setup instructions in [README.md](../README.md)

This repo uses **pnpm** as the package manager (not npm or yarn). Install dependencies from the repository root with `pnpm install`.

## Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes (keep them focused)
3. Write tests (aim for 80% coverage)
4. Run tests: `pnpm test` (runs workspace tests; see [Running Tests](#running-tests) for direct commands)
5. Run linting: `pnpm lint`
6. Build: `pnpm build`
7. Commit with conventional commits: `feat:`, `fix:`, `docs:`, etc.
8. Push and create a PR

### PostGrid mock mode

For local development and tests without calling the real PostGrid API, set **`POSTGRID_MOCK=true`** in `backend/.env` (see [AGENTS.md](../AGENTS.md) and [README.md](../README.md)). Use mock mode unless you are intentionally exercising live or test-mode PostGrid.

## AI-assisted development (`.claude/`)

Claude Code (and similar agents) can use the project’s **`.claude/`** directory: `settings.json` for tool permissions, **`skills/`** for domain runbooks (for example QA and postcard validation), and **`rules/`** for stack-specific guidance. Human contributors can ignore `.claude/` unless they want to align with the same conventions.

## Running Tests

```bash
# All tests (workspace; backend uses Bun’s test runner via pnpm script)
pnpm test

# Backend only (Bun test runner)
cd backend && bun test

# Frontend only (Vitest, one-shot — avoids watch-mode hangs)
cd frontend && npx vitest run

# Lint
cd backend && pnpm lint
cd frontend && pnpm lint
```

## Code Style

- TypeScript strict mode - properly type everything
- No comments unless necessary - code should be self-documenting
- Clear, descriptive names for functions and variables
- Keep changes minimal and focused

## Pull Requests

- Use conventional commit format in PR title
- Link related issues
- Ensure tests pass and linting is clean
- Keep PRs focused on a single change

## Questions?

Check the [README](../README.md) or open an issue.
