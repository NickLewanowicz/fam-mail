# pnpm install runs reliably on Tower; bun install can hang on "Resolving..." in this environment.
FROM node:20-bookworm-slim AS install
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile

FROM install AS build-frontend
COPY frontend ./frontend
RUN cd frontend && pnpm build

FROM oven/bun:1 AS build-backend
WORKDIR /app
COPY --from=install /app/node_modules ./node_modules
COPY --from=install /app/backend/node_modules ./backend/node_modules
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src
RUN cd backend && bun build src/index.ts --outdir ./dist --target bun

FROM oven/bun:1 AS release
WORKDIR /app
COPY --from=install /app/node_modules ./node_modules
COPY --from=install /app/backend/node_modules ./backend/node_modules
COPY --from=build-backend /app/backend/dist ./backend/dist
COPY --from=build-frontend /app/frontend/dist ./frontend/dist
COPY backend/src/database/schema.sql ./backend/src/database/schema.sql

RUN mkdir -p /data

ENV PORT=8484
ENV NODE_ENV=production

EXPOSE 8484

CMD ["bun", "run", "backend/dist/index.js"]
