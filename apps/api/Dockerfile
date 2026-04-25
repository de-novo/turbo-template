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
RUN pnpm deploy --filter=@repo/api --prod /out

# ---- runtime stage: prod-only NestJS bundle ----
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
ENV PORT=4000
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app

COPY --from=builder --chown=app:app /out ./

USER app
EXPOSE 4000
CMD ["node", "dist/main.js"]
