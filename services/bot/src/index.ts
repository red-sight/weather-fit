import path from "node:path";
import { fileURLToPath } from "node:url";

import { TelegramBot } from "@repo/telegram";

import { startCommand } from "./middleware";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const token = process.env["TG_BOT_TOKEN"];
if (!token) throw new Error("TG_BOT_TOKEN is required");

const tg = new TelegramBot({
  token,
  localesDir: path.resolve(__dirname, "../locales"),
});

tg.bot.use(startCommand);
tg.bot.on("message", (ctx) => ctx.reply("Got another message!"));

tg.bot.start();
