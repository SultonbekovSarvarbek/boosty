"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notifyUser } from "@/lib/telegram";
import { completePlacement, failPlacement } from "@/lib/orders";

export async function setChannelStatus(form: FormData) {
  await requireUser(["OWNER"]);
  const id = String(form.get("channelId"));
  const status = String(form.get("status")) === "APPROVED" ? "APPROVED" : "REJECTED";
  const ch = await prisma.channel.update({ where: { id }, data: { status } });
  await notifyUser(ch.ownerId, status === "APPROVED" ? `✅ Канал @${ch.username} добавлен в каталог Boosty.` : `❌ Канал @${ch.username} не прошёл проверку.`);
  revalidatePath("/owner");
}

export async function ownerCompletePlacement(form: FormData) {
  await requireUser(["OWNER"]);
  await completePlacement(String(form.get("placementId")));
  revalidatePath("/owner");
}

export async function ownerFailPlacement(form: FormData) {
  await requireUser(["OWNER"]);
  await failPlacement(String(form.get("placementId")), String(form.get("reason") || "Пост удалён раньше срока"));
  revalidatePath("/owner");
}

export async function markPayoutPaid(form: FormData) {
  await requireUser(["OWNER"]);
  await prisma.payout.update({ where: { id: String(form.get("payoutId")) }, data: { status: "PAID", paidAt: new Date() } });
  revalidatePath("/owner");
}
