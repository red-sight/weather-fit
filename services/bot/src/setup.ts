import type { Bot } from "grammy";

import type { BotContext } from "@repo/telegram";

const BOT_INFO = {
  en: {
    description:
      "Share your location and I'll tell you what to wear today based on the real forecast — temperature, wind, rain, UV and more.",
    shortDescription: "Weather-based outfit recommendations",
    commands: [{ command: "start", description: "Get outfit recommendations" }],
  },
  ru: {
    description:
      "Поделитесь геолокацией — и я подскажу, что надеть сегодня, основываясь на реальном прогнозе: температура, ветер, осадки, УФ-индекс и многое другое.",
    shortDescription: "Рекомендации по одежде на основе погоды",
    commands: [
      { command: "start", description: "Получить рекомендации по одежде" },
    ],
  },
} as const;

export async function setupBot(bot: Bot<BotContext>): Promise<void> {
  await Promise.all([
    bot.api.setMyDescription(BOT_INFO.en.description, { language_code: "en" }),
    bot.api.setMyDescription(BOT_INFO.ru.description, { language_code: "ru" }),
    bot.api.setMyShortDescription(BOT_INFO.en.shortDescription, {
      language_code: "en",
    }),
    bot.api.setMyShortDescription(BOT_INFO.ru.shortDescription, {
      language_code: "ru",
    }),
    bot.api.setMyCommands(BOT_INFO.en.commands, { language_code: "en" }),
    bot.api.setMyCommands(BOT_INFO.ru.commands, { language_code: "ru" }),
    bot.api.setChatMenuButton({ menu_button: { type: "commands" } }),
  ]);
}
