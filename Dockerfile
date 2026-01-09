# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files for all workspaces
COPY package*.json ./
COPY packages/web-agent/package*.json ./packages/web-agent/
RUN npm ci --legacy-peer-deps

# Copy source
COPY tsconfig.json ./
COPY src ./src
COPY packages/web-agent ./packages/web-agent

# Build React app, then backend (build script handles both)
RUN npm run build

# Stage 2: Production runtime
FROM node:22-alpine AS runtime
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

COPY package*.json ./
RUN npm ci --legacy-peer-deps --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

USER appuser

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3100/health || exit 1

CMD ["node", "--import", "./dist/tracing-loader.js", "dist/main.js"]
