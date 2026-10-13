// Воркер статистики: собирает просмотры опубликованных постов и закрывает размещения через 24 часа.
// Работает от имени обычного (служебного) аккаунта Telegram: Bot API просмотры не отдаёт.
//
// Подготовка:
//   1. Получите TG_API_ID и TG_API_HASH на https://my.telegram.org
//   2. npm run stats:login  → вставьте строку сессии в TG_SESSION
//   3. npm run stats  (лучше держать запущенным постоянно, например через pm2)
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { prisma } from "../src/lib/db";
import { parsePostUrl } from "../src/lib/telegram";
import { completePlacement, failPlacement, HOLD_HOURS } from "../src/lib/orders";

const INTERVAL_MIN = 30;
const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH || "";
const session = process.env.TG_SESSION || "";
if (!apiId || !apiHash || !session) throw new Error("Укажите TG_API_ID, TG_API_HASH и TG_SESSION в .env");

const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 5 });

async function checkOnce() {
  const live = await prisma.placement.findMany({ where: { status: "PUBLISHED" }, include: { channel: true } });
  console.log(new Date().toISOString(), `проверяю ${live.length} постов`);
  for (const p of live) {
    const parsed = p.postUrl ? parsePostUrl(p.postUrl) : null;
    if (!parsed) continue;
    try {
      const [msg] = await client.getMessages(parsed.username, { ids: [parsed.messageId] });
      const ageH = p.publishedAt ? (Date.now() - p.publishedAt.getTime()) / 3_600_000 : 0;
      if (!msg || (msg as any).className === "MessageEmpty") {
        if (ageH < HOLD_HOURS) {
          console.log(`  @${p.channel.username}: пост удалён через ${ageH.toFixed(1)} ч → возврат`);
          await failPlacement(p.id, `Пост удалён через ${ageH.toFixed(1)} ч`);
        }
        continue;
      }
      const views = msg.views ?? p.views;
      await prisma.placement.update({ where: { id: p.id }, data: { views, checkedAt: new Date() } });
      if (ageH >= HOLD_HOURS) {
        console.log(`  @${p.channel.username}: ${views} просмотров, срок прошёл → выплата`);
        await completePlacement(p.id);
      }
    } catch (e) {
      console.error(`  @${p.channel.username}: ошибка`, (e as Error).message);
    }
    await new Promise((r) => setTimeout(r, 1500)); // бережём лимиты Telegram
  }
}

async function main() {
  await client.connect();
  console.log("Воркер статистики запущен");
  for (;;) {
    await checkOnce().catch((e) => console.error(e));
    await new Promise((r) => setTimeout(r, INTERVAL_MIN * 60_000));
  }
}

main();
