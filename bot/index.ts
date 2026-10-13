// Telegram-бот Boosty для админов каналов и клиентов.
// Запуск: npm run bot  (нужен TELEGRAM_BOT_TOKEN в .env)
//
// /start <код>  — привязать Telegram к аккаунту на сайте (ссылку даёт кабинет)
// /zakazy       — новые заказы с кнопками «Принять» / «Отказать»
import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "../src/lib/db";
import { refreshOrderStatus } from "../src/lib/orders";
import { notifyUser, appUrl } from "../src/lib/telegram";
import { sum } from "../src/lib/format";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("Укажите TELEGRAM_BOT_TOKEN в .env");
const bot = new Bot(token);

bot.command("start", async (ctx) => {
  const code = ctx.match?.trim();
  const chatId = String(ctx.chat.id);
  if (code) {
    const user = await prisma.user.findUnique({ where: { linkCode: code } });
    if (!user) return ctx.reply("Ссылка устарела. Откройте кабинет на сайте и нажмите «Подключить бота» ещё раз.");
    await prisma.user.updateMany({ where: { telegramChatId: chatId, NOT: { id: user.id } }, data: { telegramChatId: null } });
    await prisma.user.update({ where: { id: user.id }, data: { telegramChatId: chatId } });
    return ctx.reply(
      `Готово, ${user.name}! Теперь уведомления Boosty будут приходить сюда.` +
        (user.role === "PUBLISHER" ? "\n\nНовые заказы: /zakazy" : ""),
    );
  }
  return ctx.reply(`Это бот Boosty: реклама в Telegram-каналах без крипты.\nСайт: ${appUrl()}`);
});

async function publisherByChat(chatId: number) {
  return prisma.user.findFirst({ where: { telegramChatId: String(chatId), role: { in: ["PUBLISHER", "OWNER"] } } });
}

bot.command("zakazy", async (ctx) => {
  const user = await publisherByChat(ctx.chat.id);
  if (!user) return ctx.reply("Сначала подключите бота из кабинета админа канала на сайте.");
  const list = await prisma.placement.findMany({
    where: { status: "PENDING", channel: { ownerId: user.id } },
    include: { channel: true, order: true },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  if (!list.length) return ctx.reply("Новых заказов нет.");
  for (const p of list) {
    const text = `@${p.channel.username}, пост ${p.postIndex} · ${sum(p.price)}\n\n${p.order.adText}\n\n${appUrl(`/r/${p.shortCode}`)}`;
    await ctx.reply(text, {
      reply_markup: new InlineKeyboard().text("✅ Принять", `acc:${p.id}`).text("❌ Отказать", `rej:${p.id}`),
      link_preview_options: { is_disabled: true },
    });
  }
  return ctx.reply(`После публикации вставьте ссылку на пост в кабинете: ${appUrl("/publisher")}`);
});

bot.callbackQuery(/^(acc|rej):(.+)$/, async (ctx) => {
  const [, action, id] = ctx.match!;
  const user = await publisherByChat(ctx.chat!.id);
  const p = await prisma.placement.findUnique({ where: { id }, include: { channel: true, order: true } });
  if (!user || !p || p.channel.ownerId !== user.id || p.status !== "PENDING") {
    return ctx.answerCallbackQuery({ text: "Заказ уже обработан" });
  }
  if (action === "acc") {
    await prisma.placement.update({ where: { id }, data: { status: "ACCEPTED" } });
    await notifyUser(p.order.clientId, `👍 @${p.channel.username} принял вашу рекламу. Сообщим, когда пост выйдет.`);
    await ctx.editMessageReplyMarkup();
    await ctx.reply("Принято. Опубликуйте пост и вставьте ссылку на него в кабинете.");
  } else {
    await prisma.placement.update({ where: { id }, data: { status: "REJECTED", rejectReason: "Админ отказал" } });
    await notifyUser(p.order.clientId, `↩️ @${p.channel.username} отказал. Деньги за этот пост вернутся.`);
    await ctx.editMessageReplyMarkup();
    await ctx.reply("Отказ отправлен клиенту.");
  }
  await refreshOrderStatus(p.orderId);
  return ctx.answerCallbackQuery();
});

bot.catch((err) => console.error("Bot error", err));
bot.start({ onStart: (me) => console.log(`Бот @${me.username} запущен`) });
