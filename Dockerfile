FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/ai/package.json packages/ai/
COPY packages/weather/package.json packages/weather/
COPY packages/telegram/package.json packages/telegram/
COPY services/bot/package.json services/bot/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/ packages/
COPY services/bot/ services/bot/

# Build all (turbo resolves dependency order via dependsOn)
RUN pnpm turbo run build --filter=@repo/bot

# Deploy bot with production dependencies only
RUN pnpm --filter=@repo/bot deploy --prod /app/deploy


FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/deploy ./

ENV NODE_ENV=production
