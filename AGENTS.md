# Weather-Fit — Project Guide

## What This Project Does

Telegram bot that gives outfit recommendations based on real-time weather. Users share location → bot fetches 8-hour forecast from Open-Meteo (free, no auth) → OpenAI generates a natural-language recommendation → bot replies in the user's language (auto-detected from Telegram).

## Monorepo Structure

```
packages/ai/        — @repo/ai: OpenAI provider + outfit recommendation logic
packages/weather/   — @repo/weather: Open-Meteo weather fetching (no auth required)
packages/telegram/  — @repo/telegram: grammy wrapper with i18n (Fluent format)
packages/eslint-config/    — shared ESLint config
packages/typescript-config/ — shared tsconfig (strict, ESM, NodeNext)

services/bot/       — @repo/bot: Telegram bot service (depends on all packages above)
```

All packages compile TypeScript (`src/`) to `dist/` and use `workspace:*` peer references.

## Commands

Run from the repo root unless noted.

```bash
pnpm install            # install all workspace deps (frozen lockfile in CI)
pnpm build              # build all packages in dep order (Turborepo)
pnpm dev                # watch mode for everything
pnpm lint               # ESLint across all packages — zero warnings allowed
pnpm check-types        # tsc --noEmit across all packages
pnpm format             # Prettier on .ts/.tsx/.md files
```

Target a single package: `pnpm --filter @repo/bot dev`

## Environment Variables

Copy `.env.example` to `.env` for local runs.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `TG_BOT_TOKEN` | Yes | — | From Telegram @BotFather |
| `OPENAI_API_KEY` | Yes | — | Used by @repo/ai |
| `REDIS_URL` | No | `redis://localhost:6379` | Rate-limit persistence |
| `OPENAI_BASE_URL` | No | — | Custom endpoint or proxy |
| `OPENAI_MODEL` | No | `openai/gpt-4o` | Any OpenAI-compatible model |

## Architecture

### Provider Pattern

Both `@repo/ai` and `@repo/weather` define an abstract base class with a single method. Concrete implementations live alongside them:

- `AiProvider.complete(messages)` → `OpenAiProvider`
- `ForecastProvider.request()` → `OpenMeteoProvider`

To swap providers: implement the abstract class, pass the new instance to the consuming code. No other changes needed.

### Bot Middleware Chain

```
Telegram message
  └─ system-limiter      (1 req/sec per user — silent drop, in-memory)
      └─ forecast-limiter   (3 req/24h per user — notifies user, Redis-backed)
          └─ location.handler  (fetches weather → calls AI → replies)
```

`/start` is handled separately via `start.command.ts` and sends a location-sharing keyboard button.

Relevant files in `services/bot/src/middleware/`:

| File | Role |
|---|---|
| `system-limiter.ts` | Flood protection via `@grammyjs/ratelimiter`. Silently drops. |
| `forecast-limiter.ts` | Business limit. Stores counts in Redis with 24h TTL. Fails **open** if Redis is down. |
| `location.handler.ts` | Main handler: extract lat/lon → `OpenMeteoProvider.request()` → `generateRecommendation()` → reply Markdown |
| `start.command.ts` | `/start` handler with location keyboard |

### AI Recommendation Logic (`packages/ai/src/recommendations.ts`)

`generateRecommendation(provider, forecast)` is the only entry point the bot uses. Internally it:

1. Decodes WMO weather codes to readable descriptions (internal lookup table)
2. Formats visibility in km
3. Builds a structured hourly summary (8 hours)
4. Sends it to the AI with a system prompt that enforces emoji formatting and instructs the model to reply in whatever language the user's message is in

The system prompt is embedded in `recommendations.ts` — edit it there to change style, tone, or formatting rules.

### Localization

User-facing strings use [Fluent](https://projectfluent.org/) (`.ftl` files) in `services/bot/locales/`. Currently `en.ftl` and `ru.ftl`. The grammy i18n middleware selects locale from `ctx.from.language_code` and falls back to `en`.

Always add new keys to **both** locale files. Use `ctx.t("key", { param: value })` to render.

## TypeScript Conventions

- Strict mode + `noUncheckedIndexedAccess` — handle potentially-undefined array access
- ESM only (`"type": "module"`, `moduleResolution: NodeNext`)
- `import type` required for type-only imports (ESLint-enforced)
- `node:` prefix required for Node built-ins
- Imports sorted by `eslint-plugin-simple-import-sort`

## Docker & Deployment

**Local dev:**
```bash
docker compose up redis -d   # Redis only
pnpm dev                     # bot reads .env automatically (tsx --env-file)
```

**Production image** is built by CI on every push to `main` → pushed to `ghcr.io`. Multi-stage Dockerfile: builder compiles TypeScript, runtime is minimal Alpine running `node dist/index.js`.

CI (`.github/workflows/deploy.yml`): lint → check-types → docker build & push. No automated tests currently.

## Adding Things

**New command or handler:** create `services/bot/src/middleware/<name>.ts` exporting a factory returning `Composer<BotContext>`, register in `services/bot/src/index.ts` with `bot.use(...)`, add locale strings.

**New AI provider:** extend `AiProvider` from `packages/ai/src/ai-provider.ts`, implement `complete(messages)`, export from `packages/ai/src/index.ts`.

**New weather provider:** extend `ForecastProvider` from `packages/weather/src/forecast-provider.ts`, implement `request()`.

**New workspace package:** create `packages/<name>/` with `package.json` (`name: "@repo/<name>"`), `tsconfig.json` extending `@repo/typescript-config/base.json`, and `src/index.ts`. Reference as `"@repo/<name>": "workspace:*"`.

**Bot metadata** (description, command list shown in Telegram): edit `services/bot/src/setup.ts` and run it once manually with `npx tsx src/setup.ts`.
