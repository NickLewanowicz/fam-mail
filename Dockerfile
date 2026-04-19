FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies (monorepo root install)
FROM base AS install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build frontend (static assets served by backend in production)
FROM install AS build-frontend
COPY frontend ./frontend
RUN cd frontend && pnpm build

# Build backend
FROM install AS build-backend
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src
RUN cd backend && bun build src/index.ts --outdir ./dist --target bun

# Production image
FROM base AS release
COPY --from=install /app/node_modules ./node_modules
COPY --from=install /app/backend/node_modules ./backend/node_modules
COPY --from=build-backend /app/backend/dist ./backend/dist
COPY --from=build-frontend /app/frontend/dist ./frontend/dist
COPY backend/src/database/schema.sql ./backend/src/database/schema.sql

# Create data directory
RUN mkdir -p /data

ENV PORT=8484
ENV NODE_ENV=production

EXPOSE 8484

CMD ["bun", "run", "backend/dist/index.js"]
