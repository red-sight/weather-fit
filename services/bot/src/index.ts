import path from "node:path";
import { fileURLToPath } from "node:url";

import { OpenAiProvider } from "@repo/ai";
import { TelegramBot } from "@repo/telegram";

import {
  createForecastLimiter,
  createLocationHandler,
  startCommand,
  systemRateLimiter,
} from "./middleware/index.js";
import { redis } from "./redis.js";
import { setupBot } from "./setup.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const token = process.env["TG_BOT_TOKEN"];
if (!token) throw new Error("TG_BOT_TOKEN is required");

const openaiApiKey = process.env["OPENAI_API_KEY"];
if (!openaiApiKey) throw new Error("OPENAI_API_KEY is required");

const openAiBaseUrl = process.env["OPENAI_BASE_URL"];
const openAiModel = process.env["OPENAI_MODEL"];

const ai = new OpenAiProvider({
  apiKey: openaiApiKey,
  baseURL: openAiBaseUrl,
  model: openAiModel,
});

await redis.connect();

const tg = new TelegramBot({
  token,
  localesDir: path.resolve(__dirname, "../locales"),
});

// Layer 1: flood protection — silently drops updates from spamming users
tg.bot.use(systemRateLimiter);

tg.bot.use(startCommand);

// Layer 2: business limit — 3 forecast requests per 24 h
tg.bot.use(createForecastLimiter(redis));

tg.bot.use(createLocationHandler(ai));

tg.bot.catch((err) => {
  console.error("Unhandled bot error:", err);
});

await setupBot(tg.bot);
tg.bot.start();
