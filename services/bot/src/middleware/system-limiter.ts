import { limit } from "@grammyjs/ratelimiter";

// Layer 1: flood / spam protection.
// Silently drops updates from users sending more than 1 message per second.
// Uses in-memory storage — sufficient for a single-instance bot and resets are
// harmless (the window is only 1 s).
export const systemRateLimiter = limit({
  timeFrame: 1000,
  limit: 1,
  storageClient: "MEMORY_STORE",
  onLimitExceeded: () => {
    // intentionally silent — do not reply, do not call next
  },
  keyGenerator: (ctx) => String(ctx.from?.id ?? "anon"),
});
