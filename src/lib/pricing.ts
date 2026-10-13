// Все расчёты цены и прогноза просмотров в одном месте.

export const COMMISSION = Number(process.env.NEXT_PUBLIC_COMMISSION_PERCENT ?? 15) / 100;
/** Повторный пост в том же канале обычно набирает меньше. */
export const REPEAT_FACTOR = 0.9;
/** Обещаем клиенту с запасом: нижняя граница прогноза. */
export const FORECAST_LOW = 0.8;
export const FORECAST_HIGH = 1.05;

export type CartItem = { channelId: string; posts: number };
export type PricedChannel = { id: string; price: number; avgViews: number };

export function feeFor(price: number) {
  return Math.round(price * COMMISSION);
}

export function cpm(price: number, views: number) {
  return views > 0 ? Math.round((price / views) * 1000) : 0;
}

export function quote(items: CartItem[], channels: PricedChannel[]) {
  let adminTotal = 0;
  let views = 0;
  let posts = 0;
  let channelCount = 0;
  for (const item of items) {
    const ch = channels.find((c) => c.id === item.channelId);
    if (!ch || item.posts < 1) continue;
    channelCount++;
    posts += item.posts;
    adminTotal += ch.price * item.posts;
    for (let i = 0; i < item.posts; i++) views += ch.avgViews * Math.pow(REPEAT_FACTOR, i);
  }
  const fee = Math.round(adminTotal * COMMISSION);
  const total = adminTotal + fee;
  return {
    adminTotal,
    fee,
    total,
    views: Math.round(views),
    low: Math.round(views * FORECAST_LOW),
    high: Math.round(views * FORECAST_HIGH),
    posts,
    channels: channelCount,
    cpm: cpm(total, views),
  };
}

export function parseCart(raw: string | undefined | null): CartItem[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => {
      const [channelId, n] = part.split(":");
      return { channelId, posts: Math.min(Math.max(parseInt(n, 10) || 0, 0), 5) };
    })
    .filter((i) => i.channelId && i.posts > 0);
}

export function cartToString(items: CartItem[]) {
  return items.filter((i) => i.posts > 0).map((i) => `${i.channelId}:${i.posts}`).join(",");
}
