# Fam Mail

Email-to-postcard conversion service. Monitor an email inbox, detect postcard requests via subject line filtering, use LLM to parse email content, and send physical postcards via USPS through PostGrid.

## What is Fam Mail?

Fam Mail is an automated email-to-postcard conversion service. It monitors an IMAP inbox for emails with specific subject lines, uses LLM-powered parsing to extract recipient details, messages, and images, then sends physical postcards via USPS through PostGrid. Perfect for automated birthday cards, special events, or staying in touch through email-to-mail conversion.

**What is PostGrid?** PostGrid is a service that provides APIs for sending physical mail programmatically. Learn more at [postgrid.com](https://www.postgrid.com/).

## Features

- 📧 IMAP email polling with configurable subject filtering
- 🤖 LLM-powered email parsing (OpenRouter, Ollama, custom endpoints)
- 📮 PostGrid API integration with test/live modes
- ✉️ Email notifications for success/failure
- 🔒 Force-test mode safety feature
- 💾 SQLite database for tracking processed emails
- 🐳 Docker container for easy deployment
- 🔒 Environment-based configuration (30+ configurable options)
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
- IMAP email account with app-specific password

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `backend/.env` and fill in your values:

```bash
cp .env.example backend/.env
# Edit backend/.env with your configuration
```

Required configuration includes:
- PostGrid API keys (test and live)
- IMAP email credentials
- LLM provider settings (OpenRouter, Ollama, or custom endpoint)
- SMTP settings for email notifications (optional)

### 3. Start Development Servers

```bash
pnpm dev
```

The frontend will be at `http://localhost:5173` and backend at `http://localhost:8484`.

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
# Copy and configure environment
cp .env.example .env
# Edit .env with your configuration

# Start with Docker Compose
docker-compose up -d

# Backend runs on port 8484
```

## Project Structure

```
fam-mail/
├── backend/          # Bun backend service
│   └── src/
│       ├── services/ # IMAP, LLM, PostGrid, notifications
│       ├── config/   # Configuration schema
│       └── database/ # SQLite database operations
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

Fam Mail uses extensive configuration through environment variables. See `.env.example` for the complete list with 30+ configurable options.

### Key Variables

| Category | Variable | Description | Required |
| ---------- | --------- | ----------- | -------- |
| **PostGrid** | `POSTGRID_MODE` | Test or live mode | Yes |
| | `POSTGRID_TEST_API_KEY` | Test API key | Yes |
| | `POSTGRID_LIVE_API_KEY` | Live API key | Yes |
| | `POSTGRID_FORCE_TEST_MODE` | Force test mode for safety | No |
| **IMAP** | `IMAP_HOST` | IMAP server hostname | Yes |
| | `IMAP_USER` | IMAP username | Yes |
| | `IMAP_PASSWORD` | IMAP password/app-specific | Yes |
| | `SUBJECT_FILTER` | Email subject filter | Yes |
| | `POLL_INTERVAL_SECONDS` | Polling frequency | No |
| **LLM** | `LLM_PROVIDER` | openrouter, ollama, or custom | Yes |
| | `LLM_API_KEY` | LLM API key | Depends |
| | `LLM_MODEL` | Model name | Yes |
| **Database** | `DATABASE_PATH` | SQLite database path | No |
| **Server** | `PORT` | Backend server port | No (8484) |
| | `LOG_LEVEL` | debug, info, warn, error | No |
| **SMTP** | `SMTP_HOST` | SMTP server for notifications | No |
| | `SMTP_USER` | SMTP username | No |

See `.env.example` for all available options and defaults.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [PostGrid](https://www.postgrid.com/) for their excellent API
- [Bun](https://bun.sh/) for the blazing-fast runtime
- [Vite](https://vitejs.dev/) for the amazing build tool
