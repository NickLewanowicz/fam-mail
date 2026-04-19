---
name: implement-feature
description: End-to-end workflow for implementing a feature or fix from a GitHub issue through to a tested PR
---

## What I Do

Take a GitHub issue number, understand the requirements, implement the change, write tests, validate everything passes, and create a pull request.

## When to Use Me

- When assigned a GitHub issue to implement
- When asked to fix a specific bug
- When building a new feature from requirements

## Workflow

### Step 1: Understand the issue
```bash
gh issue view <number>
```
Read the full description, acceptance criteria, and any linked issues.

### Step 2: Explore relevant code
Find and read the files that need to change. Understand existing patterns.

### Step 3: Create a branch
```bash
git checkout main
git pull origin main
git checkout -b <type>/<issue-number>-<short-description>
```
Types: `fix/`, `feat/`, `refactor/`, `test/`, `docs/`

### Step 4: Implement
- Make focused, minimal changes
- Follow existing code patterns
- Add/update types in `backend/src/types.ts` or `frontend/src/types/`
- Never use `any` without justification

### Step 5: Write tests
- Backend: Add `.test.ts` alongside source file
- Frontend: Add `.test.tsx` alongside component
- Cover happy path, error cases, and edge cases
- For postcard routes: test all validation scenarios

### Step 6: Validate
```bash
cd backend && pnpm test && pnpm lint && pnpm build
cd frontend && pnpm test && pnpm lint && pnpm build
```

### Step 7: Commit and PR
```bash
git add -A
git commit -m "<type>: <description>

Closes #<issue-number>"
git push -u origin HEAD
gh pr create --title "<type>: <description>" --body "## Summary\n\n- <what changed>\n\nCloses #<number>\n\n## Test Plan\n\n- [ ] Unit tests pass\n- [ ] Lint passes\n- [ ] Build succeeds"
```

## Code Patterns

### Backend route handler
```typescript
if (url.pathname === '/api/resource' && req.method === 'POST') {
  const body = await req.json();
  // validate inputs
  if (!body.requiredField) {
    return createJsonResponse({ error: 'requiredField is required' }, 400, req);
  }
  // process
  return createJsonResponse({ data: result }, 200, req);
}
```

### Frontend component test
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
});
```
