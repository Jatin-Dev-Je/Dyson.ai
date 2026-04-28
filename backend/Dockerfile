# syntax=docker/dockerfile:1.7

# ─── Builder ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install build deps from lockfile only — reproducible builds
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund

COPY tsconfig.json drizzle.config.ts ./
COPY src ./src

RUN npm run build \
 && npm prune --omit=dev --no-audit --no-fund

# ─── Runner — minimal, non-root, signal-safe ──────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    NODE_OPTIONS="--enable-source-maps"

# Run as the built-in non-root `node` user (uid 1000) — never root in prod
RUN addgroup -g 1001 nodeapp \
 && adduser -S -u 1001 -G nodeapp nodeapp

COPY --from=builder --chown=nodeapp:nodeapp /app/dist            ./dist
COPY --from=builder --chown=nodeapp:nodeapp /app/node_modules    ./node_modules
COPY --from=builder --chown=nodeapp:nodeapp /app/package.json    ./package.json
# Drizzle CLI reads schema from src; ship a copy so `npm run db:migrate` works
COPY --from=builder --chown=nodeapp:nodeapp /app/src/infra/db    ./src/infra/db
COPY --from=builder --chown=nodeapp:nodeapp /app/drizzle.config.ts ./drizzle.config.ts

USER nodeapp
EXPOSE 8080

# tini-equivalent: node's --enable-source-maps + proper SIGTERM handling in server.ts
# means we don't need a separate init. Cloud Run sends SIGTERM and waits 10s before SIGKILL.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["node", "dist/server.js"]
