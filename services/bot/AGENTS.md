# Bot Service — Agent Guide

See root [AGENTS.md](../../AGENTS.md) for project overview, commands, and env vars.

## Request Flow

```
Telegram message
  └─ system-limiter     (1 req/sec per user — silent drop, in-memory)
      └─ forecast-limiter  (3 req/24h per user — notifies user, Redis-backed)
          └─ location.handler  (fetches weather → calls AI → replies)
```

The `/start` command is handled independently via `start.command.ts` and sends a location-sharing button.

## Middleware Files

| File | Role |
|---|---|
| `middleware/system-limiter.ts` | Flood protection. Uses `@grammyjs/ratelimiter`. Drops silently. |
| `middleware/forecast-limiter.ts` | Business limit. Stores request counts in Redis with 24h TTL. Sends `forecast-limit-exceeded` i18n message on block. |
| `middleware/location.handler.ts` | Main handler. Extracts lat/lon, calls `OpenMeteoProvider.request()`, then `generateRecommendation()`, replies with Markdown. |
| `middleware/start.command.ts` | Handles `/start`. Replies with `start-message` + keyboard button for location sharing. |

## Adding a New Command or Handler

1. Create `src/middleware/<name>.ts` exporting a factory that returns a `Composer<BotContext>`
2. Register it in `src/index.ts` by calling `bot.use(createYourMiddleware(...))`
3. Add any new user-facing strings to both `locales/en.ftl` and `locales/ru.ftl`

## Redis Usage

`src/redis.ts` exports a single `ioredis` client instance, shared across middleware. The `REDIS_URL` env var configures the connection. The forecast limiter stores keys as `forecast:<userId>` with a 24-hour TTL.

If Redis is unreachable at startup the bot still starts — the forecast limiter catches errors and calls `next()` to fail open.

## Localization

Strings use [Fluent](https://projectfluent.org/) syntax. Variables are passed as the second argument to `ctx.t()`:

```ts
await ctx.reply(ctx.t("forecast-limit-exceeded", { resetIn: "12 hours" }));
```

Add keys to **both** locale files whenever adding user-facing text. The i18n middleware selects the locale based on `ctx.from.language_code`; falls back to `en`.

## Bot Setup

`src/setup.ts` sets the bot's description, short description, and command list via the Telegram Bot API. Run once after major changes to bot metadata. It is not called at runtime — invoke manually with `npx tsx src/setup.ts` if needed.

## Dev Workflow

```bash
# from repo root
docker compose up redis -d
pnpm --filter @repo/bot dev   # tsx watch, auto-reloads on save
```

The bot reads `.env` automatically in dev mode (tsx `--env-file` flag in package.json).
