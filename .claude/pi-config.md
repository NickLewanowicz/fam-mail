# Fam Mail - Quick Agent Reference

You are working on the fam-mail project. Here are the essential commands:

## Test Everything
```bash
cd backend && bun test
cd frontend && npx vitest run  
cd backend && pnpm lint
cd frontend && pnpm lint
cd frontend && pnpm build
```

## Fix an Issue
1. Read the issue description
2. Find and read relevant source files
3. Make focused, atomic changes
4. Run the test commands above
5. Fix any failures
6. Commit: `git add -A && git commit -m "fix: description (#ISSUE)"`

## Project Layout
- backend/src/routes/ - API endpoints
- backend/src/services/ - Business logic (postgrid, imap, llm)
- frontend/src/pages/ - React pages (DashboardPage, CreatePage)
- frontend/src/components/wizard/ - Wizard steps
- frontend/src/components/postcard/ - Postcard preview

## Environment
- Copy backend/.env.example to backend/.env
- Set POSTGRID_MOCK=true for development
- Backend runs on port 8484, frontend on 5173
