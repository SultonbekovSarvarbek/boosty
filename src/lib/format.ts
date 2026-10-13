export const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU").replace(/[  ,]/g, " ");
export const sum = (n: number) => `${fmt(n)} сум`;
export const short = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",") + "K" : String(n);
export const initials = (s: string) =>
  s.replace(/\(.*?\)/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
export function plural(n: number, one: string, few: string, many: string) {
  const m = n % 10, h = n % 100;
  if (m === 1 && h !== 11) return one;
  if (m >= 2 && m <= 4 && (h < 12 || h > 14)) return few;
  return many;
}
export const dateTime = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export const ORDER_STATUS: Record<string, string> = {
  AWAITING_PAYMENT: "Ждёт оплаты",
  PAID: "Оплачен, ждём админов",
  IN_PROGRESS: "В работе",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};

export const PLACEMENT_STATUS: Record<string, { label: string; tone: "muted" | "blue" | "good" | "warn" | "bad" }> = {
  AWAITING_PAYMENT: { label: "Ждёт оплаты", tone: "muted" },
  PENDING: { label: "Ждёт админа", tone: "warn" },
  ACCEPTED: { label: "Принят", tone: "blue" },
  REJECTED: { label: "Отказ, возврат", tone: "bad" },
  PUBLISHED: { label: "Опубликован", tone: "blue" },
  COMPLETED: { label: "Висел 24 ч", tone: "good" },
  FAILED: { label: "Удалён, возврат", tone: "bad" },
};
