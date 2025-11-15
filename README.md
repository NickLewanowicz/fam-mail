# Fam Mail

A simple, lightweight wrapper around the PostGrid API for sending postcards to friends and family. Perfect for birthdays, special events, or just staying in touch the old-fashioned way.

## What is Fam Mail?

Fam Mail is a straightforward web application that makes it incredibly easy to send physical postcards through the mail. Simply load the page, upload an image, add your message and recipient details, and let PostGrid handle the rest. No authentication, no complexity—just a clean interface for spreading joy through the mail.

**What is PostGrid?** PostGrid is a service that provides APIs for sending physical mail programmatically. Learn more at [postgrid.com](https://www.postgrid.com/).

## Features

- 🎨 Simple, intuitive UI for creating postcards
- 📮 Direct integration with PostGrid API
- 🐳 Docker container for easy deployment
- 🔒 Environment-based configuration (no hardcoded secrets)
- 💪 Fully type-safe with TypeScript
- 🚀 Fast development with Bun and Vite

## Tech Stack

- **Backend**: Bun runtime with TypeScript
- **Frontend**: Vite + React + TypeScript
- **Deployment**: Docker container for easy self-hosting
- **Package Manager**: pnpm

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [pnpm](https://pnpm.io/) (v8+)
- [PostGrid API Key](https://www.postgrid.com/)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Create `backend/.env`:

```bash
cd backend
echo "POSTGRID_API_KEY=your_api_key_here
PORT=3001
NODE_ENV=development" > .env
cd ..
```

### 3. Start Development Servers

```bash
pnpm dev
```

The frontend will be at `http://localhost:5173` and backend at `http://localhost:3001`.

## Commands

```bash
pnpm dev                 # Start both frontend and backend
pnpm build               # Build for production
pnpm start               # Run production build
pnpm test                # Run all tests
pnpm lint                # Check for linting errors
./scripts/ci-local.sh    # Run full CI checks locally before pushing
```

## Docker Quick Start

```bash
# Create .env with your PostGrid API key
echo "POSTGRID_API_KEY=your_key_here" > .env

# Start with Docker Compose
docker-compose up -d

# Open http://localhost:3000
```

## Project Structure

```
fam-mail/
├── backend/          # Bun backend service
├── frontend/         # Vite + React + TypeScript frontend
├── docs/             # Documentation
├── docker-compose.yml
├── Dockerfile
└── pnpm-workspace.yaml
```

## Documentation

- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment, Docker, and self-hosting
- **[Contributing Guide](docs/CONTRIBUTING.md)** - Guidelines for contributors
- **[Architecture Overview](docs/ARCHITECTURE.md)** - Technical details and project structure

## Environment Variables

### Development (`backend/.env`)

| Variable           | Description           | Required | Default       |
| ------------------ | --------------------- | -------- | ------------- |
| `POSTGRID_API_KEY` | Your PostGrid API key | Yes      | -             |
| `PORT`             | Backend server port   | No       | `3001`        |
| `NODE_ENV`         | Environment mode      | No       | `development` |

### Production (`.env` in root)

| Variable           | Description           | Required | Default |
| ------------------ | --------------------- | -------- | ------- |
| `POSTGRID_API_KEY` | Your PostGrid API key | Yes      | -       |

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [PostGrid](https://www.postgrid.com/) for their excellent API
- [Bun](https://bun.sh/) for the blazing-fast runtime
- [Vite](https://vitejs.dev/) for the amazing build tool
