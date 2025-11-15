# Fam Mail Project Structure

This document provides an overview of the complete project structure.

## Directory Tree

```
fam-mail/
├── .vscode/
│   ├── extensions.json          # Recommended VSCode extensions
│   └── settings.json             # VSCode workspace settings
│
├── backend/                      # Bun backend service
│   ├── src/
│   │   ├── index.ts             # Server entry point
│   │   ├── server.ts            # Request handler & routing
│   │   ├── server.test.ts       # Backend tests
│   │   └── types.ts             # TypeScript type definitions
│   ├── .eslintrc.json           # ESLint configuration
│   ├── package.json             # Backend dependencies
│   └── tsconfig.json            # TypeScript configuration
│
├── frontend/                     # Vite + React frontend
│   ├── src/
│   │   ├── App.css              # Component styles
│   │   ├── App.test.tsx         # Frontend tests
│   │   ├── App.tsx              # Main React component
│   │   ├── index.css            # Global styles
│   │   ├── main.tsx             # React entry point
│   │   ├── setupTests.ts        # Test configuration
│   │   └── vite-env.d.ts        # Vite type definitions
│   ├── .eslintrc.json           # ESLint configuration
│   ├── index.html               # HTML entry point
│   ├── package.json             # Frontend dependencies
│   ├── tsconfig.json            # TypeScript configuration
│   ├── tsconfig.node.json       # TypeScript config for Vite
│   ├── vite.config.ts           # Vite configuration
│   └── vitest.config.ts         # Vitest test configuration
│
├── .dockerignore                 # Docker ignore patterns
├── .gitignore                    # Git ignore patterns
├── CONTRIBUTING.md               # Contribution guidelines
├── docker-compose.yml            # Docker Compose configuration
├── Dockerfile                    # Docker build configuration
├── LICENSE                       # MIT License
├── package.json                  # Root package.json (workspace)
├── pnpm-workspace.yaml           # pnpm workspace configuration
├── PROJECT_STRUCTURE.md          # This file
├── QUICKSTART.md                 # Quick start guide
├── README.md                     # Project overview
└── SETUP.md                      # Detailed setup instructions
```

## File Descriptions

### Root Configuration Files

| File                  | Purpose                                                             |
| --------------------- | ------------------------------------------------------------------- |
| `package.json`        | Root workspace configuration with scripts for running both services |
| `pnpm-workspace.yaml` | Defines pnpm workspace with backend and frontend packages           |
| `.gitignore`          | Git ignore patterns for node_modules, dist, .env, etc.              |
| `.dockerignore`       | Patterns to exclude from Docker builds                              |
| `Dockerfile`          | Multi-stage Docker build for production deployment                  |
| `docker-compose.yml`  | Docker Compose setup for easy containerized deployment              |
| `LICENSE`             | MIT License                                                         |

### Documentation Files

| File                   | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `README.md`            | Project overview, features, and basic usage     |
| `QUICKSTART.md`        | 5-minute quick start guide                      |
| `SETUP.md`             | Detailed setup and deployment instructions      |
| `CONTRIBUTING.md`      | Guidelines for contributors                     |
| `PROJECT_STRUCTURE.md` | This file - complete project structure overview |

### Backend Files

| File                         | Purpose                                |
| ---------------------------- | -------------------------------------- |
| `backend/src/index.ts`       | Entry point - starts Bun server        |
| `backend/src/server.ts`      | Request handler with routing and CORS  |
| `backend/src/server.test.ts` | Backend unit tests                     |
| `backend/src/types.ts`       | TypeScript interfaces for PostGrid API |
| `backend/package.json`       | Backend dependencies and scripts       |
| `backend/tsconfig.json`      | TypeScript configuration for backend   |
| `backend/.eslintrc.json`     | ESLint rules for backend               |

### Frontend Files

| File                          | Purpose                                 |
| ----------------------------- | --------------------------------------- |
| `frontend/src/main.tsx`       | React entry point                       |
| `frontend/src/App.tsx`        | Main application component              |
| `frontend/src/App.css`        | Component-specific styles               |
| `frontend/src/App.test.tsx`   | Frontend unit tests                     |
| `frontend/src/index.css`      | Global styles                           |
| `frontend/src/setupTests.ts`  | Test environment setup                  |
| `frontend/src/vite-env.d.ts`  | Vite type definitions                   |
| `frontend/index.html`         | HTML entry point                        |
| `frontend/package.json`       | Frontend dependencies and scripts       |
| `frontend/tsconfig.json`      | TypeScript configuration for frontend   |
| `frontend/tsconfig.node.json` | TypeScript config for Vite config files |
| `frontend/vite.config.ts`     | Vite build and dev server configuration |
| `frontend/vitest.config.ts`   | Vitest test framework configuration     |
| `frontend/.eslintrc.json`     | ESLint rules for frontend               |

### VSCode Configuration

| File                      | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `.vscode/extensions.json` | Recommended extensions (ESLint, Bun, etc.) |
| `.vscode/settings.json`   | Workspace settings (format on save, etc.)  |

## Key Features Implemented

### ✅ Monorepo Structure

- pnpm workspaces for managing multiple packages
- Shared root scripts for running both services

### ✅ Backend (Bun)

- Bun runtime for blazing-fast performance
- TypeScript for type safety
- CORS support for frontend communication
- Health check endpoint (`/api/health`)
- Test endpoint (`/api/test`) for frontend verification
- Serves frontend static files in production
- Unit tests with Bun's built-in test runner

### ✅ Frontend (Vite + React)

- Vite for fast development and building
- React 18 with TypeScript
- Beautiful gradient UI with responsive design
- Backend connection status indicator
- Proxy configuration for API calls in development
- Unit tests with Vitest and React Testing Library

### ✅ Docker Support

- Multi-stage Dockerfile for optimized builds
- Docker Compose for easy deployment
- Health checks configured
- Environment variable support

### ✅ Development Experience

- Hot reload for both backend and frontend
- TypeScript strict mode enabled
- ESLint configured for both packages
- VSCode recommended extensions
- Comprehensive test setup

### ✅ Documentation

- Comprehensive README
- Quick start guide
- Detailed setup instructions
- Contributing guidelines
- Project structure overview

## Next Steps for Development

1. **PostGrid Integration**

   - Add PostGrid API client in `backend/src/services/postgrid.ts`
   - Implement postcard sending endpoint
   - Add request validation

2. **Frontend Features**

   - Create postcard form component
   - Add image upload functionality
   - Build address input component
   - Add preview functionality

3. **Testing**

   - Add integration tests
   - Add E2E tests with Playwright
   - Increase test coverage

4. **Deployment**
   - Set up CI/CD pipeline
   - Deploy to production
   - Configure monitoring and logging

## Environment Variables

### Development

Create `backend/.env`:

```env
POSTGRID_API_KEY=your_api_key_here
PORT=3001
NODE_ENV=development
```

### Production (Docker)

Create `.env` in project root:

```env
POSTGRID_API_KEY=your_api_key_here
```

## Commands Reference

### Development

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Start both backend and frontend
cd backend && pnpm dev    # Start backend only
cd frontend && pnpm dev   # Start frontend only
```

### Building

```bash
pnpm build                # Build both packages
cd backend && pnpm build  # Build backend only
cd frontend && pnpm build # Build frontend only
```

### Testing

```bash
pnpm test                 # Run all tests
cd backend && pnpm test   # Run backend tests
cd frontend && pnpm test  # Run frontend tests
```

### Linting

```bash
pnpm lint                 # Lint all packages
cd backend && pnpm lint   # Lint backend
cd frontend && pnpm lint  # Lint frontend
```

### Docker

```bash
docker build -t fam-mail .              # Build image
docker run -p 3000:3000 fam-mail        # Run container
docker-compose up -d                     # Start with compose
docker-compose down                      # Stop compose
docker-compose logs -f                   # View logs
```

## Port Configuration

| Service             | Development Port | Production Port |
| ------------------- | ---------------- | --------------- |
| Backend             | 3001             | 3000            |
| Frontend Dev Server | 5173             | -               |
| Docker Container    | -                | 3000            |

## Technology Stack Summary

### Backend

- **Runtime**: Bun (v1.0+)
- **Language**: TypeScript
- **Testing**: Bun Test
- **Linting**: ESLint with TypeScript plugin

### Frontend

- **Framework**: React 18
- **Build Tool**: Vite 5
- **Language**: TypeScript
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint with React plugins

### DevOps

- **Package Manager**: pnpm
- **Containerization**: Docker + Docker Compose
- **Version Control**: Git

### Type Safety

- Strict TypeScript configuration
- Type-safe API calls
- Strongly typed PostGrid interfaces

## Project Status

✅ **Complete Starter Template**

- All core infrastructure is in place
- Development environment is ready
- Docker deployment is configured
- Basic tests are implemented
- Documentation is comprehensive

⏳ **To Be Implemented**

- PostGrid API integration
- Postcard creation UI
- Image upload functionality
- Address book management
- Production deployment

## Getting Help

- **Quick Start**: See [QUICKSTART.md](./QUICKSTART.md)
- **Detailed Setup**: See [SETUP.md](./SETUP.md)
- **Contributing**: See [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Overview**: See [README.md](./README.md)
