"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, homeFor } from "@/lib/auth";

export type FormState = { error?: string; ok?: string } | undefined;

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9) return "+998" + digits;
  if (digits.length === 12 && digits.startsWith("998")) return "+" + digits;
  return null;
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const phone = normalizePhone(String(form.get("phone") || ""));
  const name = String(form.get("name") || "").trim();
  const password = String(form.get("password") || "");
  const role = form.get("role") === "PUBLISHER" ? "PUBLISHER" : "CLIENT";
  const next = String(form.get("next") || "");
  if (!phone) return { error: "Введите номер в формате +998 90 123 45 67" };
  if (name.length < 2) return { error: "Введите имя или название компании" };
  if (password.length < 6) return { error: "Пароль должен быть не короче 6 символов" };
  if (await prisma.user.findUnique({ where: { phone } })) return { error: "Этот номер уже зарегистрирован. Войдите." };
  const user = await prisma.user.create({ data: { phone, name, role, passwordHash: await bcrypt.hash(password, 10) } });
  await createSession(user.id);
  redirect(next.startsWith("/") ? next : homeFor(user.role));
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const phone = normalizePhone(String(form.get("phone") || ""));
  const password = String(form.get("password") || "");
  const next = String(form.get("next") || "");
  const user = phone ? await prisma.user.findUnique({ where: { phone } }) : null;
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Неверный номер или пароль" };
  await createSession(user.id);
  redirect(next.startsWith("/") ? next : homeFor(user.role));
}

export async function logout() {
  destroySession();
  redirect("/");
}
