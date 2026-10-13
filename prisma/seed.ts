// Заполняет базу: тематики, аккаунт владельца и демо-каналы.
// Запуск: npm run db:seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES = [
  { id: "auto", name: "Авто", hint: "машины, шины, запчасти", color: "#2aabee" },
  { id: "news", name: "Новости", hint: "город и страна", color: "#e2574c" },
  { id: "travel", name: "Путешествия", hint: "туры, визы, билеты", color: "#20b2aa" },
  { id: "food", name: "Еда", hint: "рестораны, доставка", color: "#f5a623" },
  { id: "fashion", name: "Мода", hint: "одежда, обувь", color: "#c45ad8" },
  { id: "realty", name: "Недвижимость", hint: "квартиры, аренда", color: "#5b7fe6" },
  { id: "tech", name: "Техника", hint: "телефоны, гаджеты", color: "#3fb46b" },
  { id: "edu", name: "Образование", hint: "курсы, языки", color: "#ef7c3a" },
];

// Условные каналы для демонстрации. Перед запуском замените на реальные.
const DEMO_CHANNELS: [string, string, string, number, number, number][] = [
  ["auto", "demo_avtorynok", "Авторынок Ташкент (демо)", 40000, 8000, 400000],
  ["auto", "demo_avto_news", "Авто новости UZ (демо)", 80000, 15000, 600000],
  ["auto", "demo_taxi", "Водители такси (демо)", 25000, 6000, 250000],
  ["news", "demo_tash_news", "Новости Ташкента (демо)", 150000, 30000, 900000],
  ["news", "demo_uz_today", "Узбекистан сегодня (демо)", 90000, 17000, 650000],
  ["travel", "demo_tury", "Горящие туры UZ (демо)", 45000, 7500, 350000],
  ["food", "demo_gde_poest", "Где поесть в Ташкенте (демо)", 60000, 11000, 420000],
  ["fashion", "demo_style", "Стиль Ташкент (демо)", 38000, 6500, 280000],
  ["realty", "demo_kvartiry", "Квартиры Ташкент (демо)", 48000, 9000, 450000],
  ["tech", "demo_gadgets", "Гаджеты UZ (демо)", 41000, 7800, 320000],
  ["edu", "demo_ielts", "IELTS и английский (демо)", 36000, 6800, 270000],
];

async function main() {
  for (const [i, c] of CATEGORIES.entries()) {
    await prisma.category.upsert({ where: { id: c.id }, update: c, create: { ...c, sort: i } });
  }

  const phone = process.env.OWNER_PHONE;
  const password = process.env.OWNER_PASSWORD;
  if (!phone || !password) throw new Error("Укажите OWNER_PHONE и OWNER_PASSWORD в .env");
  const owner = await prisma.user.upsert({
    where: { phone },
    update: { role: "OWNER" },
    create: { phone, name: "Владелец", role: "OWNER", passwordHash: await bcrypt.hash(password, 10) },
  });

  for (const [categoryId, username, title, subscribers, avgViews, price] of DEMO_CHANNELS) {
    await prisma.channel.upsert({
      where: { username },
      update: {},
      create: { categoryId, username, title, subscribers, avgViews, price, ownerId: owner.id, status: "APPROVED", isDemo: true },
    });
  }
  console.log("Готово: тематики, владелец", phone, "и", DEMO_CHANNELS.length, "демо-каналов");
}

main().finally(() => prisma.$disconnect());
