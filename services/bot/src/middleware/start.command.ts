import { type BotContext,Composer } from "@repo/telegram";

const composer = new Composer<BotContext>();

composer.command("start", (ctx) =>
  ctx.reply(ctx.t("start"), {
    reply_markup: {
      keyboard: [[{ text: ctx.t("share-location"), request_location: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  })
);

export { composer as startCommand };
