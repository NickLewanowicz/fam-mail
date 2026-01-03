# Deployment Guide

## Quick Start (Docker)

1. Clone repository:
   ```bash
   git clone https://github.com/your-org/fam-mail.git
   cd fam-mail
   ```

2. Copy environment template:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your configuration

4. Run with Docker Compose:
   ```bash
   docker compose up -d
   ```

## Unraid Deployment

1. Add Container in Unraid
2. Settings:
   - Repository: `ghcr.io/your-org/fam-mail:latest`
   - Port: `8484:8484`
   - Volume: `/path/to/appdata/fammail/data:/data`
3. Add environment variables from `.env.example`
4. Start container

## Environment Variables

See `.env.example` for all required variables.

## Health Check

```bash
curl http://localhost:8484/api/health
```

## Logs

```bash
docker logs -f fammail
```
