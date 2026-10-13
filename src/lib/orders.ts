// Переходы статусов заказа и размещений. Используются сайтом, ботом и воркером.
import { prisma } from "./db";
import { notifyUser } from "./telegram";
import { sum } from "./format";

export const HOLD_HOURS = 24;

/** Пересчитывает статус заказа по статусам его размещений. */
export async function refreshOrderStatus(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { placements: true } });
  if (!order || order.status === "AWAITING_PAYMENT" || order.status === "CANCELLED") return;
  const st = order.placements.map((p) => p.status);
  const terminal = st.every((s) => s === "COMPLETED" || s === "REJECTED" || s === "FAILED");
  const started = st.some((s) => s === "ACCEPTED" || s === "PUBLISHED" || s === "COMPLETED");
  const refunded = order.placements
    .filter((p) => p.status === "REJECTED" || p.status === "FAILED")
    .reduce((a, p) => a + p.price + p.fee, 0);
  const status = terminal ? "COMPLETED" : started ? "IN_PROGRESS" : "PAID";
  if (status !== order.status || refunded !== order.refunded) {
    await prisma.order.update({ where: { id: orderId }, data: { status, refunded } });
    if (status === "COMPLETED") {
      await notifyUser(order.clientId, `✅ Кампания завершена. Отчёт готов на сайте.${refunded ? `\nВозврат: ${sum(refunded)}` : ""}`);
    }
  }
}

/** После оплаты: размещения уходят админам. */
export async function markOrderPaid(orderId: string, provider: string, amount: number, externalId?: string) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      payments: { create: { provider, amount, status: "PAID", externalId } },
      placements: { updateMany: { where: { status: "AWAITING_PAYMENT" }, data: { status: "PENDING" } } },
    },
    include: { placements: { include: { channel: true } } },
  });
  const byOwner = new Map<string, string[]>();
  for (const p of order.placements) {
    const list = byOwner.get(p.channel.ownerId) ?? [];
    list.push(`• @${p.channel.username}, пост ${p.postIndex}: ${sum(p.price)}`);
    byOwner.set(p.channel.ownerId, list);
  }
  for (const [ownerId, lines] of byOwner) {
    await notifyUser(ownerId, `📩 Новый заказ на рекламу\n${lines.join("\n")}\n\nОткройте кабинет, чтобы принять или отказать.`);
  }
  return order;
}

/** Размещение провисело срок: начисляем выплату админу. */
export async function completePlacement(placementId: string) {
  const current = await prisma.placement.findUniqueOrThrow({ where: { id: placementId } });
  if (current.status !== "PUBLISHED") return;
  const p = await prisma.placement.update({
    where: { id: placementId },
    data: { status: "COMPLETED", payout: { create: { amount: current.price } } },
    include: { channel: true },
  });
  await notifyUser(p.channel.ownerId, `💰 Пост в @${p.channel.username} провисел ${HOLD_HOURS} ч. Начислено ${sum(p.price)}.`);
  await refreshOrderStatus(p.orderId);
}

/** Пост удалён раньше срока или не вышел: возврат клиенту. */
export async function failPlacement(placementId: string, reason: string) {
  const p = await prisma.placement.update({
    where: { id: placementId },
    data: { status: "FAILED", rejectReason: reason },
    include: { order: true, channel: true },
  });
  await notifyUser(p.order.clientId, `⚠️ Пост в @${p.channel.username} не продержался срок. Сумма ${sum(p.price + p.fee)} вернётся.`);
  await refreshOrderStatus(p.orderId);
}
