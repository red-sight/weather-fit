import { type BotContext, Composer } from "@repo/telegram";
import type { Redis } from "ioredis";

const FORECAST_LIMIT = 3;
const WINDOW_SECONDS = 24 * 60 * 60;

function formatTtl(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Layer 2: business-level forecast limit.
// Allows at most FORECAST_LIMIT location requests per 24-hour window per user.
// When the limit is reached the user receives a localised reply with the reset time.
export function createForecastLimiter(redis: Redis) {
  const composer = new Composer<BotContext>();

  composer.on("message:location", async (ctx, next) => {
    const userId = ctx.from?.id;
    if (userId === undefined) return next();

    const key = `forecast:limit:${userId}`;

    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, WINDOW_SECONDS);
      }

      if (count > FORECAST_LIMIT) {
        const ttl = await redis.ttl(key);
        await ctx.reply(ctx.t("forecast-limit-exceeded", { resetIn: formatTtl(Math.max(ttl, 0)) }));
        return;
      }
    } catch {
      // Redis unavailable — fail open so the bot keeps working
    }

    return next();
  });

  return composer;
}
