"use server";
import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseCart, quote, feeFor } from "@/lib/pricing";
import { markOrderPaid } from "@/lib/orders";
import type { FormState } from "./auth";

const shortCode = () => randomBytes(5).toString("base64url");

function normalizeLink(raw: string) {
  const v = raw.trim();
  if (!v) return null;
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try { return new URL(withProto).toString(); } catch { return null; }
}

export async function createOrder(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(["CLIENT", "OWNER"]);
  const items = parseCart(String(form.get("items") || ""));
  const adText = String(form.get("adText") || "").trim();
  const link = normalizeLink(String(form.get("link") || ""));
  const promoCode = String(form.get("promoCode") || "").trim() || null;
  const dateRaw = String(form.get("desiredDate") || "");
  if (!items.length) return { error: "Выберите хотя бы один канал" };
  if (adText.length < 20) return { error: "Текст поста слишком короткий: напишите хотя бы пару предложений" };
  if (adText.length > 1000) return { error: "Текст длиннее 1000 символов" };
  if (!link) return { error: "Укажите ссылку, куда вести людей: сайт, бот или Instagram" };

  const channels = await prisma.channel.findMany({ where: { id: { in: items.map((i) => i.channelId) }, status: "APPROVED" } });
  const valid = items.filter((i) => channels.some((c) => c.id === i.channelId));
  if (!valid.length) return { error: "Выбранные каналы сейчас недоступны" };
  const q = quote(valid, channels);

  const placements = valid.flatMap((i) => {
    const ch = channels.find((c) => c.id === i.channelId)!;
    return Array.from({ length: i.posts }, (_, k) => ({ channelId: ch.id, postIndex: k + 1, price: ch.price, fee: feeFor(ch.price), shortCode: shortCode() }));
  });

  const order = await prisma.order.create({
    data: {
      clientId: user.id,
      adText,
      link,
      promoCode,
      desiredDate: dateRaw ? new Date(dateRaw) : null,
      adminTotal: q.adminTotal,
      fee: placements.reduce((a, p) => a + p.fee, 0),
      total: q.adminTotal + placements.reduce((a, p) => a + p.fee, 0),
      placements: { create: placements },
    },
  });
  redirect(`/orders/${order.id}`);
}

/**
 * Заглушка оплаты. Когда будут договоры с Click/Payme, здесь создаётся счёт у провайдера,
 * а заказ помечается оплаченным в обработчике их уведомления (src/app/api/payments/...).
 */
export async function payStub(form: FormData) {
  const user = await requireUser();
  const orderId = String(form.get("orderId"));
  const provider = String(form.get("provider") || "stub");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.clientId !== user.id || order.status !== "AWAITING_PAYMENT") redirect(`/orders/${orderId}`);
  await markOrderPaid(order.id, provider, order.total, `stub-${Date.now()}`);
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}?paid=1`);
}

export async function cancelOrder(form: FormData) {
  const user = await requireUser();
  const orderId = String(form.get("orderId"));
  await prisma.order.updateMany({ where: { id: orderId, clientId: user.id, status: "AWAITING_PAYMENT" }, data: { status: "CANCELLED" } });
  redirect("/orders");
}
