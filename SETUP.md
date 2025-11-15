# Fam Mail Setup Guide

This guide will help you get Fam Mail up and running in both development and production environments.

## Prerequisites

Make sure you have the following installed:

- **Bun** (v1.0 or higher) - [Install Bun](https://bun.sh/)
- **Node.js** (v18 or higher) - [Install Node.js](https://nodejs.org/)
- **pnpm** (v8 or higher) - [Install pnpm](https://pnpm.io/)
- **Docker** (optional, for containerized deployment) - [Install Docker](https://www.docker.com/)

## Development Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd fam-mail
```

### 2. Install Dependencies

From the root directory, run:

```bash
pnpm install
```

This will install dependencies for both the backend and frontend workspaces.

### 3. Configure Environment Variables

#### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
touch .env
```

Add the following to `backend/.env`:

```env
POSTGRID_API_KEY=your_postgrid_api_key_here
PORT=3001
NODE_ENV=development
```

To get your PostGrid API key:

1. Sign up at [postgrid.com](https://www.postgrid.com/)
2. Navigate to your dashboard
3. Go to Settings > API Keys
4. Copy your API key

### 4. Start Development Servers

You have two options:

**Option A: Start both services at once** (recommended)

```bash
# From the root directory
pnpm dev
```

This will start:

- Backend on `http://localhost:3001`
- Frontend on `http://localhost:5173`

**Option B: Start services individually**

```bash
# Terminal 1 - Backend
cd backend
pnpm dev

# Terminal 2 - Frontend (new terminal)
cd frontend
pnpm dev
```

### 5. Verify Setup

Open your browser and navigate to `http://localhost:5173`. You should see the Fam Mail interface with a green checkmark indicating the frontend and backend are communicating successfully.

## Production Build

### Local Production Build

```bash
# Build both frontend and backend
pnpm build

# Start the production server
pnpm start
```

The application will be available at `http://localhost:3001` (backend serves the frontend in production).

## Docker Deployment

### Option 1: Docker Build and Run

```bash
# Build the Docker image
docker build -t fam-mail .

# Run the container
docker run -p 3000:3000 \
  -e POSTGRID_API_KEY=your_api_key_here \
  fam-mail
```

The application will be available at `http://localhost:3000`.

### Option 2: Docker Compose (Recommended)

1. Create a `.env` file in the project root (not in backend):

```bash
touch .env
```

2. Add your PostGrid API key to `.env`:

```env
POSTGRID_API_KEY=your_postgrid_api_key_here
```

3. Start the application:

```bash
docker-compose up -d
```

4. View logs:

```bash
docker-compose logs -f
```

5. Stop the application:

```bash
docker-compose down
```

## Testing

### Run All Tests

```bash
pnpm test
```

### Run Backend Tests Only

```bash
cd backend
pnpm test
```

### Run Frontend Tests Only

```bash
cd frontend
pnpm test
```

## Linting

### Run All Linters

```bash
pnpm lint
```

### Fix Linting Issues

```bash
cd backend && pnpm lint --fix
cd frontend && pnpm lint --fix
```

## Project Structure

```
fam-mail/
├── backend/                 # Bun backend service
│   ├── src/
│   │   ├── index.ts        # Entry point
│   │   ├── server.ts       # Request handler
│   │   └── types.ts        # TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                # Environment variables (create this)
├── frontend/                # Vite + React frontend
│   ├── src/
│   │   ├── App.tsx         # Main component
│   │   ├── main.tsx        # Entry point
│   │   ├── App.css         # Component styles
│   │   └── index.css       # Global styles
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile               # Docker build configuration
├── package.json             # Root package.json
├── pnpm-workspace.yaml      # pnpm workspace config
└── README.md               # Main documentation
```

## Common Issues

### Port Already in Use

If you get an error about ports being in use:

```bash
# Find process using port 3001 (backend)
lsof -ti:3001 | xargs kill -9

# Find process using port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### Dependencies Not Installing

Try clearing the cache and reinstalling:

```bash
pnpm store prune
rm -rf node_modules backend/node_modules frontend/node_modules
pnpm install
```

### Bun Not Found

Make sure Bun is installed and in your PATH:

```bash
curl -fsSL https://bun.sh/install | bash
```

After installation, restart your terminal or run:

```bash
source ~/.bashrc  # or ~/.zshrc depending on your shell
```

## Self-Hosting

For production deployment on your own server:

1. **Using Docker** (recommended):

   - Push your image to Docker Hub or a private registry
   - Pull and run on your server with docker-compose
   - Set up a reverse proxy (nginx, Caddy, Traefik) for HTTPS

2. **Direct Deployment**:
   - Clone the repository on your server
   - Build the application: `pnpm build`
   - Use a process manager like PM2 to keep it running
   - Set up a reverse proxy for HTTPS

### Example nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

For HTTPS, use Certbot with Let's Encrypt:

```bash
sudo certbot --nginx -d your-domain.com
```

## Environment Variables Reference

### Backend (.env in backend directory)

| Variable           | Description           | Required | Default       |
| ------------------ | --------------------- | -------- | ------------- |
| `POSTGRID_API_KEY` | Your PostGrid API key | Yes      | -             |
| `PORT`             | Backend server port   | No       | `3001`        |
| `NODE_ENV`         | Environment mode      | No       | `development` |

### Docker (.env in root directory)

| Variable           | Description           | Required | Default |
| ------------------ | --------------------- | -------- | ------- |
| `POSTGRID_API_KEY` | Your PostGrid API key | Yes      | -       |

## Next Steps

Now that you have the basic setup running, you can:

1. Implement the postcard creation form in the frontend
2. Integrate the PostGrid API in the backend
3. Add validation and error handling
4. Implement image upload functionality
5. Add address book management
6. Create tests for new features

## Getting Help

- Check the [README.md](./README.md) for general information
- Review the [PostGrid API Documentation](https://docs.postgrid.com/)
- Open an issue on GitHub if you encounter problems

## Contributing

Contributions are welcome! Please ensure:

- Code is properly typed with TypeScript
- Tests are included for new features
- Linting passes without errors
- Commits follow conventional commit format
