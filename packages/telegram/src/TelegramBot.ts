import { I18n, type I18nFlavor } from "@grammyjs/i18n";
import { Bot, Composer, type Context } from "grammy";

export { Composer };

export type BotContext = Context & I18nFlavor;

export class TelegramBot {
  bot: Bot<BotContext>;

  constructor({ token, localesDir }: { token: string; localesDir: string }) {
    const i18n = new I18n<BotContext>({
      defaultLocale: "en",
      directory: localesDir,
    });
    this.bot = new Bot<BotContext>(token);
    this.bot.use(i18n);
  }
}
