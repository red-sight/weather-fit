import { type BotContext,Composer } from "@repo/telegram";

const composer = new Composer<BotContext>();

composer.command("start", (ctx) => ctx.reply(ctx.t("start")));

export { composer as startCommand };
