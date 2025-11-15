# Deployment Guide

This guide covers deploying Fam Mail to production, including Docker deployment and self-hosting options.

## Development vs Production

### Development

- Backend runs on port 3001
- Frontend dev server runs on port 5173
- Hot reload enabled for both services
- CORS configured for local development

### Production

- Single port (3000) serves both backend API and frontend static files
- Optimized builds for both services
- Environment variables for configuration
- No CORS needed (same origin)

## Local Production Build

Test the production build locally before deploying:

```bash
# Build both services
pnpm build

# Start production server
pnpm start
```

The application will be available at `http://localhost:3001` (or `http://localhost:3000` when `NODE_ENV=production`).

## Docker Deployment

### Option 1: Docker Run

```bash
# Build the image
docker build -t fam-mail .

# Run the container
docker run -d \
  -p 3000:3000 \
  -e POSTGRID_API_KEY=your_api_key_here \
  --name fam-mail \
  fam-mail
```

### Option 2: Docker Compose (Recommended)

1. Create `.env` in the project root:

```env
POSTGRID_API_KEY=your_api_key_here
```

2. Start the application:

```bash
docker-compose up -d
```

3. View logs:

```bash
docker-compose logs -f
```

4. Stop the application:

```bash
docker-compose down
```

The application will be available at `http://localhost:3000`.

## Self-Hosting

### Prerequisites

- Linux server (Ubuntu/Debian recommended)
- Docker and Docker Compose installed
- Domain name (optional, but recommended)
- SSL certificate (use Let's Encrypt with Certbot)

### Deployment Steps

1. **Clone the repository:**

```bash
git clone https://github.com/nicklewanowicz/fam-mail.git
cd fam-mail
```

2. **Create `.env` file:**

```bash
echo "POSTGRID_API_KEY=your_api_key_here" > .env
```

3. **Start with Docker Compose:**

```bash
docker-compose up -d
```

4. **Set up reverse proxy (nginx):**

Create `/etc/nginx/sites-available/fam-mail`:

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

5. **Enable the site:**

```bash
sudo ln -s /etc/nginx/sites-available/fam-mail /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

6. **Set up SSL with Let's Encrypt:**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

7. **Set up auto-renewal:**

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Environment Variables

### Required

- `POSTGRID_API_KEY` - Your PostGrid API key from [postgrid.com](https://www.postgrid.com/)

### Optional

- `PORT` - Server port (default: 3001 dev, 3000 prod)
- `NODE_ENV` - Environment mode (`development` or `production`)

## Health Checks

The application includes a health check endpoint:

```bash
curl http://localhost:3000/api/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2025-11-15T12:00:00.000Z",
  "message": "Fam Mail backend is running"
}
```

## Monitoring

### Docker Logs

```bash
# Follow logs
docker-compose logs -f

# View recent logs
docker-compose logs --tail=100

# View specific service logs
docker-compose logs fam-mail
```

### Resource Usage

```bash
# View container stats
docker stats fam-mail
```

## Updating

To update your deployment:

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 3000
sudo lsof -i :3000

# Kill the process if needed
sudo kill -9 <PID>
```

### Container Won't Start

```bash
# Check container logs
docker-compose logs fam-mail

# Inspect container
docker inspect fam-mail

# Check environment variables
docker exec fam-mail env
```

### Permission Issues

```bash
# Make sure environment file is readable
chmod 644 .env

# Check docker permissions
sudo usermod -aG docker $USER
newgrp docker
```

## Security

- Never commit `.env` files
- Use strong API keys, rotate periodically
- Always use HTTPS in production
- Keep Docker images updated

## Getting Help

If you encounter issues:

1. Check the [README](../README.md) for basic setup
2. Review the logs: `docker-compose logs -f`
3. Verify environment variables are set correctly
4. Ensure PostGrid API key is valid
5. Check the [Contributing Guide](CONTRIBUTING.md) for development details
