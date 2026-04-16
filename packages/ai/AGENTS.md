# @repo/ai — Agent Guide

See root [AGENTS.md](../../AGENTS.md) for project overview, commands, and conventions.

## Purpose

Provides an `AiProvider` abstraction and the `generateRecommendation()` function that turns a weather forecast into an outfit recommendation string.

## Public API

```ts
import { OpenAiProvider, generateRecommendation } from "@repo/ai";

const ai = new OpenAiProvider(apiKey, { baseURL?, model? });
const text = await generateRecommendation(ai, forecastData);
```

`generateRecommendation` is the only consumer-facing entry point in practice — the bot calls it and doesn't interact with `OpenAiProvider` directly beyond construction.

## Adding a New AI Provider

1. Extend `AiProvider` from `src/ai-provider.ts`
2. Implement `complete(messages: ChatMessage[]): Promise<string>`
3. Export from `src/index.ts`
4. Pass the new provider instance to `generateRecommendation()` — no other changes needed

`AiProvider` is intentionally minimal: one method, plain message objects. Streaming, tool use, and structured output are intentionally out of scope.

## Recommendation Logic (`src/recommendations.ts`)

`generateRecommendation` receives an `HourlyForecast` (from `@repo/weather`) and:

1. Decodes WMO weather codes to human-readable descriptions via an internal lookup table
2. Formats visibility (meters → km string)
3. Builds a structured natural-language forecast summary (one line per hour, 8 hours)
4. Sends it to the AI with a system prompt that instructs emoji usage, brevity, and language matching (respond in the user's language — the user message is in whatever language Telegram reported)

The system prompt is embedded in `recommendations.ts`. Edit it there to change recommendation style, tone, or formatting rules.

## Model Configuration

`OpenAiProvider` accepts `baseURL` to point at any OpenAI-compatible endpoint (e.g., OpenRouter, local Ollama with OpenAI shim). The `model` defaults to `openai/gpt-4o` but can be overridden via the `OPENAI_MODEL` env var, which the bot reads and passes to the constructor.
