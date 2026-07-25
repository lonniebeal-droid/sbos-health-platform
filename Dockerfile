# Multi-Stage Production Dockerfile for SBOS Enterprise Healthcare OS
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install clean dependencies
RUN npm ci

# Copy source files
COPY . .

# Build Vite frontend & Esbuild CommonJS backend server
RUN npm run build

# Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built application assets and dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

USER node

CMD ["node", "dist/server.cjs"]
