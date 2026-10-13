"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notifyUser, parsePostUrl } from "@/lib/telegram";
import { refreshOrderStatus } from "@/lib/orders";
import type { FormState } from "./auth";

const int = (v: FormDataEntryValue | null) => Math.round(Number(String(v ?? "").replace(/\s/g, "")));

export async function addChannel(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(["PUBLISHER", "OWNER"]);
  const username = String(form.get("username") || "").trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "");
  const title = String(form.get("title") || "").trim();
  const categoryId = String(form.get("categoryId") || "");
  const subscribers = int(form.get("subscribers"));
  const avgViews = int(form.get("avgViews"));
  const price = int(form.get("price"));
  const rules = String(form.get("rules") || "").trim() || null;

  if (!/^[A-Za-z0-9_]{4,32}$/.test(username)) return { error: "Укажите @username канала (латиница, цифры, _)" };
  if (title.length < 2) return { error: "Укажите название канала" };
  if (!(await prisma.category.findUnique({ where: { id: categoryId } }))) return { error: "Выберите тематику" };
  if (!(subscribers >= 1000)) return { error: "Принимаем каналы от 1000 подписчиков" };
  if (!(avgViews > 0 && avgViews <= subscribers * 1.5)) return { error: "Проверьте средние просмотры поста" };
  if (!(price >= 10000)) return { error: "Укажите цену поста в сумах (от 10 000)" };
  if (await prisma.channel.findUnique({ where: { username } })) return { error: "Этот канал уже добавлен" };

  await prisma.channel.create({ data: { username, title, categoryId, subscribers, avgViews, price, rules, ownerId: user.id } });
  revalidatePath("/publisher");
  return { ok: "Канал отправлен на проверку. Обычно это занимает до одного дня." };
}

async function ownPlacement(placementId: string) {
  const user = await requireUser(["PUBLISHER", "OWNER"]);
  const p = await prisma.placement.findUnique({ where: { id: placementId }, include: { channel: true, order: true } });
  if (!p || (p.channel.ownerId !== user.id && user.role !== "OWNER")) throw new Error("Нет доступа");
  return p;
}

export async function updateChannel(form: FormData) {
  const user = await requireUser(["PUBLISHER", "OWNER"]);
  const id = String(form.get("channelId"));
  const ch = await prisma.channel.findUnique({ where: { id } });
  if (!ch || (ch.ownerId !== user.id && user.role !== "OWNER")) return;
  const price = int(form.get("price"));
  const paused = form.get("paused") === "on";
  await prisma.channel.update({
    where: { id },
    data: {
      price: price >= 10000 ? price : ch.price,
      status: ch.status === "APPROVED" && paused ? "PAUSED" : ch.status === "PAUSED" && !paused ? "APPROVED" : ch.status,
    },
  });
  revalidatePath("/publisher");
}

export async function acceptPlacement(form: FormData) {
  const p = await ownPlacement(String(form.get("placementId")));
  if (p.status !== "PENDING") return;
  await prisma.placement.update({ where: { id: p.id }, data: { status: "ACCEPTED" } });
  await notifyUser(p.order.clientId, `👍 @${p.channel.username} принял вашу рекламу. Сообщим, когда пост выйдет.`);
  await refreshOrderStatus(p.orderId);
  revalidatePath("/publisher");
}

export async function rejectPlacement(form: FormData) {
  const p = await ownPlacement(String(form.get("placementId")));
  if (p.status !== "PENDING" && p.status !== "ACCEPTED") return;
  const reason = String(form.get("reason") || "").trim() || "Админ отказал";
  await prisma.placement.update({ where: { id: p.id }, data: { status: "REJECTED", rejectReason: reason } });
  await notifyUser(p.order.clientId, `↩️ @${p.channel.username} отказал: ${reason}. Деньги за этот пост вернутся.`);
  await refreshOrderStatus(p.orderId);
  revalidatePath("/publisher");
}

export async function publishPlacement(_: FormState, form: FormData): Promise<FormState> {
  const p = await ownPlacement(String(form.get("placementId")));
  if (p.status !== "ACCEPTED") return { error: "Сначала примите заказ" };
  const url = String(form.get("postUrl") || "").trim();
  const parsed = parsePostUrl(url);
  if (!parsed) return { error: "Вставьте ссылку на пост вида t.me/канал/123" };
  if (parsed.username.toLowerCase() !== p.channel.username.toLowerCase()) return { error: `Ссылка должна вести в @${p.channel.username}` };
  await prisma.placement.update({
    where: { id: p.id },
    data: { status: "PUBLISHED", postUrl: `https://t.me/${parsed.username}/${parsed.messageId}`, publishedAt: new Date() },
  });
  await notifyUser(p.order.clientId, `📢 Ваш пост вышел в @${p.channel.username}: https://t.me/${parsed.username}/${parsed.messageId}`);
  await refreshOrderStatus(p.orderId);
  revalidatePath("/publisher");
  return { ok: "Отмечено. Деньги придут после 24 часов, если пост будет на месте." };
}
