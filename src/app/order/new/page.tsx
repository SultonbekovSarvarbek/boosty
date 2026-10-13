import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { parseCart, quote, cartToString } from "@/lib/pricing";
import { fmt, plural } from "@/lib/format";
import { OrderForm } from "@/components/OrderForm";

export default async function NewOrderPage({ searchParams }: { searchParams: { items?: string } }) {
  const items = parseCart(searchParams.items);
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/order/new?items=${cartToString(items)}`)}`);
  if (user.role === "PUBLISHER") {
    return <div className="card">Заказывать рекламу может аккаунт бизнеса. Вы вошли как админ канала. <Link href="/publisher">Перейти в кабинет</Link></div>;
  }
  const channels = await prisma.channel.findMany({ where: { id: { in: items.map((i) => i.channelId) }, status: "APPROVED" } });
  const valid = items.filter((i) => channels.some((c) => c.id === i.channelId));
  if (!valid.length) return <div className="card">Корзина пуста. <Link href="/catalog">Выберите каналы</Link></div>;
  const q = quote(valid, channels);

  return (
    <div className="layout">
      <div>
        <h1>Что рекламируем?</h1>
        <p className="lead">Этот пост получат админы выбранных каналов.</p>
        <OrderForm items={cartToString(valid)} />
      </div>
      <aside className="sum" style={{ display: "grid" }}>
        <h2>Ваш заказ</h2>
        <div className="lines">
          {valid.map((i) => {
            const c = channels.find((x) => x.id === i.channelId)!;
            return <div key={c.id}><span>{c.title} × {i.posts}</span><span className="num">{fmt(c.price * i.posts)}</span></div>;
          })}
          <div><span>Сервис</span><span className="num">{fmt(q.fee)}</span></div>
        </div>
        <div className="total"><span>К оплате</span><b className="num">{fmt(q.total)} сум</b></div>
        <div className="views">
          <small>Ожидаемые просмотры</small>
          <b className="num">{fmt(q.low)}–{fmt(q.high)}</b>
          <small>{q.channels} {plural(q.channels, "канал", "канала", "каналов")} · {q.posts} {plural(q.posts, "пост", "поста", "постов")}</small>
        </div>
        <Link href="/catalog" className="btn ghost">Изменить каналы</Link>
      </aside>
    </div>
  );
}
