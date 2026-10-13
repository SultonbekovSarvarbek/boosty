// Отправка уведомлений через Bot API. Работает без запущенного процесса бота.
import { prisma } from "./db";

export async function notifyUser(userId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.telegramChatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: user.telegramChatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
  } catch (e) {
    console.error("Telegram notify failed", e);
  }
}

export function appUrl(path = "") {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "") + path;
}

/** Разбирает ссылку вида https://t.me/channel/123 */
export function parsePostUrl(url: string): { username: string; messageId: number } | null {
  const m = url.trim().match(/^(?:https?:\/\/)?t\.me\/([A-Za-z0-9_]{4,})\/(\d+)/);
  return m ? { username: m[1], messageId: Number(m[2]) } : null;
}
