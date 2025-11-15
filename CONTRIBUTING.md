# Contributing to Fam Mail

Thank you for your interest in contributing to Fam Mail! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment for all contributors

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/fam-mail.git`
3. Add the upstream remote: `git remote add upstream https://github.com/nicklewanowicz/fam-mail.git`
4. Follow the setup instructions in [SETUP.md](./SETUP.md)

## Development Workflow

### 1. Create a Branch

Always create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:

- `feature/` - for new features
- `fix/` - for bug fixes
- `docs/` - for documentation updates
- `refactor/` - for code refactoring
- `test/` - for adding or updating tests

### 2. Make Your Changes

- Write clean, readable, and maintainable code
- Follow the existing code style
- Keep changes focused and minimal
- Use descriptive variable and function names
- Avoid comments unless absolutely necessary (code should be self-explanatory)

### 3. Type Safety

This project uses TypeScript. Ensure all code is properly typed:

```typescript
interface Address {
  firstName: string
  lastName: string
  addressLine1: string
  addressLine2?: string
  city: string
  provinceOrState: string
  postalOrZip: string
  countryCode: string
}
```

Never use `any` without a good reason. Prefer `unknown` if you must.

### 4. Testing

Write tests for all new features and bug fixes:

```bash
# Run tests
pnpm test

# Run tests in watch mode
cd backend && bun test --watch
cd frontend && pnpm test --watch
```

Test coverage should be at least 80% for new code.

#### Backend Testing (Bun)

```typescript
import { describe, it, expect } from 'bun:test'

describe('handleRequest', () => {
  it('should return health check status', async () => {
    const req = new Request('http://localhost:3001/api/health')
    const res = await handleRequest(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.status).toBe('ok')
  })
})
```

#### Frontend Testing (Vitest)

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('should render the header', () => {
    render(<App />)
    expect(screen.getByText(/Fam Mail/i)).toBeInTheDocument()
  })
})
```

### 5. Linting

Run the linter and fix any issues:

```bash
# Check for linting errors
pnpm lint

# Auto-fix linting issues
cd backend && pnpm lint --fix
cd frontend && pnpm lint --fix
```

### 6. Commit Your Changes

Use conventional commit messages:

```bash
git add .
git commit -m "feat: add postcard preview feature"
```

Commit message format:

- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, semicolons, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:

```
feat: add image upload functionality
fix: resolve CORS issue with PostGrid API
docs: update README with deployment instructions
refactor: simplify address validation logic
test: add unit tests for postcard service
```

### 7. Push and Create a Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Pull Request Guidelines

### PR Title

Use the same conventional commit format:

```
feat: add user address book
```

### PR Description

Use this template:

```markdown
## Description

Brief description of what this PR does.

## Related Issues

Closes #123

## Changes Made

- Added address book component
- Implemented local storage for addresses
- Added validation for address fields

## Testing

- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Linting passes

## Screenshots (if applicable)

[Add screenshots here]
```

### Before Submitting

- [ ] Code follows the project style guidelines
- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] TypeScript compiles without errors
- [ ] Changes are documented (if needed)
- [ ] Commit messages follow conventional commit format

## Code Style Guidelines

### TypeScript

```typescript
interface User {
  firstName: string
  lastName: string
  email: string
}

function getUserDisplayName(user: User): string {
  return `${user.firstName} ${user.lastName}`
}
```

### React Components

```typescript
interface PostcardProps {
  imageUrl: string
  message: string
  recipient: Address
}

function PostcardPreview({ imageUrl, message, recipient }: PostcardProps) {
  return (
    <div className="postcard-preview">
      <img src={imageUrl} alt="Postcard" />
      <p>{message}</p>
      <AddressDisplay address={recipient} />
    </div>
  )
}

export default PostcardPreview
```

### Backend Handlers

```typescript
async function sendPostcard(req: Request): Promise<Response> {
  const body = await req.json()

  const result = await postgridService.sendPostcard(body)

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}
```

## Project Structure

```
fam-mail/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── server.ts         # Request handler
│   │   ├── services/         # Business logic
│   │   ├── types.ts          # Type definitions
│   │   └── utils/            # Helper functions
│   └── tests/                # Test files
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom hooks
│   │   ├── services/         # API calls
│   │   ├── types/            # Type definitions
│   │   └── utils/            # Helper functions
│   └── tests/                # Test files
```

## Adding Dependencies

Before adding a new dependency, consider:

- Is it really necessary?
- Is it actively maintained?
- What's the bundle size impact?
- Are there lighter alternatives?

```bash
# Backend
cd backend
pnpm add <package-name>

# Frontend
cd frontend
pnpm add <package-name>
```

## Documentation

Update documentation when:

- Adding new features
- Changing existing behavior
- Fixing bugs that weren't obvious
- Adding new configuration options

Files to update:

- `README.md` - Overview and quick start
- `SETUP.md` - Detailed setup instructions
- `CONTRIBUTING.md` - Contributing guidelines (this file)
- Inline JSDoc for complex functions

## Questions?

If you have questions:

1. Check the [README.md](./README.md) and [SETUP.md](./SETUP.md)
2. Search existing issues
3. Open a new issue with the question label

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
