# Multi-Stage Production Dockerfile for SBOS Enterprise Healthcare OS
#
# Stages:
#   builder   — full (dev+prod) deps, compiles the Vite frontend and the
#               esbuild CommonJS server bundle into /app/dist.
#   prod-deps — production-only node_modules (npm ci --omit=dev). The server
#               bundle is built with `--packages=external`, so express, dotenv,
#               @google/genai and vite (imported at module load) must resolve
#               from node_modules at runtime; all four are in `dependencies`.
#   runner    — minimal image: dist/ + docs/ + pruned node_modules, non-root.

FROM node:22-alpine AS builder

WORKDIR /app

# Copy package descriptors and install a clean, reproducible dependency tree.
COPY package*.json ./
RUN npm ci

# Copy source and build the frontend (vite -> dist/) and server bundle
# (esbuild -> dist/server.cjs).
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# Production-only dependencies (kept separate so dev tooling — esbuild, tsx,
# vitest, typescript, autoprefixer — never lands in the final image).
FROM node:22-alpine AS prod-deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------------------------------------------------------------------------
# Final runtime image.
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Built assets (frontend bundle + index.html + dist/server.cjs).
COPY --from=builder /app/dist ./dist
# OpenAPI spec: server.ts serves docs/openapi.json from process.cwd() at
# /api/docs/openapi.json, so it must be present in the runtime image.
COPY --from=builder /app/docs ./docs
# package.json for runtime metadata; small and harmless.
COPY --from=builder /app/package.json ./package.json
# Pruned production dependencies.
COPY --from=prod-deps /app/node_modules ./node_modules

EXPOSE 3000

# Container-level liveness probe (independent of docker-compose). Uses BusyBox
# wget, which ships in the alpine base image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Drop privileges — run as the built-in unprivileged `node` user.
USER node

CMD ["node", "dist/server.cjs"]
