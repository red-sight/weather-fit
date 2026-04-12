import { I18n, type I18nFlavor } from "@grammyjs/i18n";
import { Bot, type Context } from "grammy";

export type BotContext = Context & I18nFlavor;

const i18n = new I18n<BotContext>({
  defaultLocale: "en",
  directory: "locales",
});

export class TelegramBot {
  bot: Bot<BotContext>;

  constructor({ token }: { token: string }) {
    this.bot = new Bot<BotContext>(token);
    this.bot.use(i18n);
  }
}
