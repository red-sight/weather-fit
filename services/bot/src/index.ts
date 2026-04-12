import path from "node:path";
import { fileURLToPath } from "node:url";

import { OpenAiProvider } from "@repo/ai";
import { TelegramBot } from "@repo/telegram";

import { createLocationHandler, startCommand } from "./middleware/index.js";
import { setupBot } from "./setup.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const token = process.env["TG_BOT_TOKEN"];
if (!token) throw new Error("TG_BOT_TOKEN is required");

const openaiApiKey = process.env["OPENAI_API_KEY"];
if (!openaiApiKey) throw new Error("OPENAI_API_KEY is required");

const ai = new OpenAiProvider({ apiKey: openaiApiKey });

const tg = new TelegramBot({
  token,
  localesDir: path.resolve(__dirname, "../locales"),
});

tg.bot.use(startCommand);
tg.bot.use(createLocationHandler(ai));
tg.bot.on("message", (ctx) => ctx.reply("Got another message!"));

await setupBot(tg.bot);
tg.bot.start();
