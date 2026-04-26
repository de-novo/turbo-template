# syntax=docker/dockerfile:1.7
# Build context must be the repo root: `docker build -f apps/api/Dockerfile .`

ARG NODE_VERSION=24-alpine
ARG PNPM_VERSION=10.33.2

# ---- deps stage: pnpm fetch ----
FROM node:${NODE_VERSION} AS deps
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch --prod=false

# ---- build stage: install + tsc build + deploy prod-only tree ----
FROM node:${NODE_VERSION} AS builder
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo
COPY --from=deps /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml ./
COPY --from=deps /root/.local/share/pnpm/store /root/.local/share/pnpm/store
COPY . .
RUN pnpm install --offline --frozen-lockfile
RUN pnpm --filter @repo/api... build
# pnpm v10 made `pnpm deploy` require `inject-workspace-packages=true` by
# default; the `--legacy` flag preserves the symlinked-deps path the rest of
# the workspace already uses without forcing inject-workspace globally.
RUN pnpm deploy --legacy --filter=@repo/api --prod /out

# ---- runtime stage: prod-only NestJS bundle ----
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
ENV PORT=4000
RUN addgroup -S app && adduser -S app -G app && apk add --no-cache wget
WORKDIR /app

COPY --from=builder --chown=app:app /out ./

USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --spider --tries=1 "http://127.0.0.1:${PORT}/health/live" || exit 1
CMD ["node", "dist/main.js"]
