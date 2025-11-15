# Architecture Overview

## Technology Stack

- **Backend**: Bun with TypeScript
- **Frontend**: Vite + React + TypeScript
- **Monorepo**: pnpm workspaces
- **Deployment**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

## Project Structure

```
fam-mail/
├── .github/
│   └── workflows/
│       └── ci.yml               # CI/CD pipeline
├── backend/
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── server.ts           # Request handler
│   │   ├── server.test.ts      # Backend tests
│   │   └── types.ts            # TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── .eslintrc.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Main component
│   │   ├── App.test.tsx        # Frontend tests
│   │   ├── main.tsx            # Entry point
│   │   ├── setupTests.ts       # Test config
│   │   ├── App.css
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vitest.config.ts
├── docs/
│   ├── ARCHITECTURE.md         # This file
│   ├── CONTRIBUTING.md
│   └── DEPLOYMENT.md
├── .gitignore
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── LICENSE
├── package.json                # Workspace root
├── pnpm-workspace.yaml
└── README.md
```

## Key Decisions

- **Bun**: Native TypeScript, fast startup, built-in test runner
- **Vite**: Fast HMR, optimized builds
- **pnpm workspaces**: Unified monorepo management
- **Docker multi-stage**: Small images, reproducible builds

## API Design

### Endpoints

| Endpoint        | Method | Purpose                     |
| --------------- | ------ | --------------------------- |
| `/api/health`   | GET    | Health check                |
| `/api/test`     | GET    | Connection verification     |
| `/api/postcard` | POST   | Send postcard (future)      |
| `/*`            | GET    | Serve frontend (production) |

### Request/Response Flow

```
Development:
Frontend (5173) → Vite Proxy → Backend (3001)

Production:
Client → Backend (3000) → {
  /api/* → API handlers
  /* → Static files
}
```

## Data Flow

```
User Input → React Component → API Call → Bun Server → PostGrid API
                                              ↓
                                         Response
                                              ↓
                                    React Component Update
```

## Type Safety

### Shared Types

PostGrid API types are defined in `backend/src/types.ts`:

```typescript
export interface Address {
  firstName: string
  lastName: string
  addressLine1: string
  addressLine2?: string
  city: string
  provinceOrState: string
  postalOrZip: string
  countryCode: string
}

export interface PostcardRequest {
  to: Address
  from: Address
  frontImageUrl?: string
  message: string
}
```

### API Contracts

Frontend and backend share the same type definitions to ensure type safety across the stack.

## Testing Strategy

### Testing

- Backend: Bun test for unit tests
- Frontend: Vitest + React Testing Library
- CI: GitHub Actions runs linting, tests, builds

## Environment Configuration

### Development

- `backend/.env` - Backend configuration
- Vite proxy for API calls
- Hot reload enabled

### Production

- `.env` in root for Docker
- Backend serves frontend static files
- Single origin (no CORS needed)

## Security

- Never commit `.env` files
- API keys via environment variables
- TypeScript strict mode
- Docker non-root user
