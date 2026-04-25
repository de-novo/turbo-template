# syntax=docker/dockerfile:1.7
# Build context must be the repo root: `docker build -f apps/web/Dockerfile .`

ARG NODE_VERSION=24-alpine
ARG PNPM_VERSION=10.33.2

# ---- deps stage: pnpm fetch ----
FROM node:${NODE_VERSION} AS deps
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch --prod=false

# ---- build stage: install + Next standalone build ----
FROM node:${NODE_VERSION} AS builder
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo
COPY --from=deps /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml ./
COPY --from=deps /root/.local/share/pnpm/store /root/.local/share/pnpm/store
COPY . .
RUN pnpm install --offline --frozen-lockfile
RUN pnpm --filter @repo/web... build

# ---- runtime stage: minimal Next standalone server ----
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app

# Standalone bundle includes only the files needed at runtime, plus a
# pruned node_modules. Static assets and public/ are copied separately.
COPY --from=builder --chown=app:app /repo/apps/web/.next/standalone/ ./
COPY --from=builder --chown=app:app /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=app:app /repo/apps/web/public ./apps/web/public

USER app
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node", "server.js"]
