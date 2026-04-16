# Weather-Fit

A Telegram bot that recommends what to wear based on real-time weather at your location.

## How It Works

1. Send `/start` — the bot sends a button to share your location
2. Share your location — the bot fetches an 8-hour weather forecast
3. An AI generates a natural-language outfit recommendation in your language
4. The bot replies with what to wear, tailored to current conditions

Languages are detected automatically from your Telegram settings. No account, no sign-up.

## Features

- Real-time weather via [Open-Meteo](https://open-meteo.com/) — free, no API key needed on the weather side
- AI recommendations via OpenAI (GPT-4o by default, configurable)
- Responds in the user's language (currently localized for EN and RU)
- Rate-limited: 3 forecast requests per user per 24 hours
- Flood protection: 1 request/second per user (silent drop)
- Redis-backed rate limiting — fails open if Redis is unavailable

## Monorepo Structure

```
packages/
  ai/         — @repo/ai      OpenAI provider + outfit recommendation logic
  weather/    — @repo/weather  Open-Meteo weather fetching
  telegram/   — @repo/telegram grammy wrapper with Fluent i18n
  eslint-config/              shared ESLint config
  typescript-config/          shared tsconfig (strict, ESM, NodeNext)

services/
  bot/        — @repo/bot     Telegram bot service
```

## Local Development

**Prerequisites:** Node.js 22+, pnpm, Docker (for Redis)

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Fill in TG_BOT_TOKEN and OPENAI_API_KEY

# 3. Start Redis
docker compose up redis -d

# 4. Run in watch mode
pnpm dev
```

### Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `TG_BOT_TOKEN` | Yes | — | From Telegram [@BotFather](https://t.me/BotFather) |
| `OPENAI_API_KEY` | Yes | — | OpenAI or compatible API key |
| `REDIS_URL` | No | `redis://localhost:6379` | Rate-limit persistence |
| `OPENAI_BASE_URL` | No | — | Custom endpoint or proxy |
| `OPENAI_MODEL` | No | `openai/gpt-4o` | Any OpenAI-compatible model ID |

### Common Commands

```bash
pnpm build          # compile all packages
pnpm dev            # watch mode (all packages)
pnpm lint           # ESLint — zero warnings allowed
pnpm check-types    # tsc --noEmit across all packages
pnpm format         # Prettier
```

Target a single package: `pnpm --filter @repo/bot dev`

## Deployment

The production image is built automatically by CI on every push to `main` and pushed to GitHub Container Registry (`ghcr.io`).

The Dockerfile uses a multi-stage build: TypeScript is compiled in a builder stage, the runtime stage is minimal Alpine running `node dist/index.js`.

To run in production with Docker Compose:

```bash
docker compose up -d
```

Make sure your `.env` (or environment) has `TG_BOT_TOKEN`, `OPENAI_API_KEY`, and `REDIS_URL` set.

## Architecture Notes

### Middleware Chain

```
Telegram message
  └─ system-limiter      1 req/sec per user — silent drop, in-memory
      └─ forecast-limiter   3 req/24h per user — notifies user, Redis-backed
          └─ location.handler  weather → AI → reply
```

### Provider Pattern

Both AI and weather integrations use an abstract base class with a single method. Swapping providers means implementing the interface and passing the new instance in — no other changes needed.

### Localization

User-facing strings live in `services/bot/locales/` as [Fluent](https://projectfluent.org/) `.ftl` files. Locale is selected from `ctx.from.language_code` with `en` as fallback. To add a language, add a new `.ftl` file and register it in the i18n setup.

## Tech Stack

- [grammY](https://grammy.dev/) — Telegram Bot framework
- [Open-Meteo](https://open-meteo.com/) — weather API (free, no auth)
- [OpenAI API](https://platform.openai.com/) — language model
- [Fluent](https://projectfluent.org/) — localization
- [Turborepo](https://turbo.build/) — monorepo build system
- [pnpm](https://pnpm.io/) — package manager
- TypeScript (strict, ESM)
