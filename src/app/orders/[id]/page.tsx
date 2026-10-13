import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { quote } from "@/lib/pricing";
import { fmt, sum, dateTime, ORDER_STATUS, PLACEMENT_STATUS } from "@/lib/format";
import { payStub, cancelOrder } from "@/app/actions/orders";
import { Avatar } from "@/components/Avatar";
import { ShieldIcon } from "@/components/icons";

const METHODS = [
  ["click", "Click", "#00a4e4"],
  ["payme", "Payme", "#33cccc"],
  ["uzcard", "Uzcard / Humo", "#1f4fa3"],
  ["invoice", "Счёт для юрлица", "#8a9aa9"],
] as const;

export default async function OrderPage({ params, searchParams }: { params: { id: string }; searchParams: { paid?: string } }) {
  const user = await requireUser();
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { placements: { include: { channel: { include: { category: true } } }, orderBy: [{ channelId: "asc" }, { postIndex: "asc" }] } },
  });
  if (!order || (order.clientId !== user.id && user.role !== "OWNER")) notFound();

  const items = Object.values(
    order.placements.reduce<Record<string, { channelId: string; posts: number }>>((acc, p) => {
      acc[p.channelId] ??= { channelId: p.channelId, posts: 0 };
      acc[p.channelId].posts++;
      return acc;
    }, {}),
  );
  const forecast = quote(items, order.placements.map((p) => ({ id: p.channelId, price: p.price, avgViews: p.channel.avgViews })));
  const views = order.placements.reduce((a, p) => a + p.views, 0);
  const clicks = order.placements.reduce((a, p) => a + p.clicks, 0);
  const spent = order.total - order.refunded;
  const maxViews = Math.max(1, ...order.placements.map((p) => p.views));

  return (
    <div className="stack">
      <div className="between">
        <div>
          <h1 style={{ margin: 0 }}>Заказ от {dateTime(order.createdAt)}</h1>
          <span className={`tag ${order.status === "COMPLETED" ? "good" : order.status === "AWAITING_PAYMENT" ? "warn" : "blue"}`}>{ORDER_STATUS[order.status]}</span>
        </div>
        <Link href="/orders" className="btn ghost sm">Все заказы</Link>
      </div>

      {searchParams.paid && <div className="success">Оплата прошла. Заказ отправлен админам каналов, мы сообщим, когда посты выйдут.</div>}

      {order.status === "AWAITING_PAYMENT" && (
        <form action={payStub} className="card">
          <h2>Оплата {sum(order.total)}</h2>
          <input type="hidden" name="orderId" value={order.id} />
          <div className="pay">
            {METHODS.map(([k, label, color], i) => (
              <label key={k} className="pm">
                <input type="radio" name="provider" value={k} defaultChecked={i === 0} />
                <i style={{ width: 24, height: 24, borderRadius: 7, background: color, flex: "none" }} />{label}
              </label>
            ))}
          </div>
          <div className="safe"><ShieldIcon />
            <div>Деньги замораживаются. Админ получит оплату только после того, как пост выйдет и провисит 24 часа. Если админ откажет или удалит пост раньше, сумма вернётся.</div>
          </div>
          <div className="row">
            <button className="btn lg">Оплатить {sum(order.total)}</button>
            <button className="btn danger" formAction={cancelOrder}>Отменить заказ</button>
          </div>
          <p className="note" style={{ margin: 0 }}>Сейчас оплата работает в тестовом режиме: деньги не списываются.</p>
        </form>
      )}

      <div className="kpis">
        <div className="kpi hl"><small>Просмотры</small><b className="num">{fmt(views)}</b></div>
        <div className="kpi"><small>Прогноз</small><b className="num">{fmt(forecast.low)}–{fmt(forecast.high)}</b></div>
        <div className="kpi"><small>Переходы</small><b className="num">{fmt(clicks)}</b></div>
        <div className="kpi"><small>Сум за переход</small><b className="num">{clicks ? fmt(spent / clicks) : "—"}</b></div>
        {order.refunded > 0 && <div className="kpi"><small>Возврат</small><b className="num">{fmt(order.refunded)}</b></div>}
      </div>

      <div className="tablewrap">
        <table>
          <thead><tr><th>Канал</th><th>Статус</th><th className="r">Просмотры</th><th className="r">Переходы</th><th className="r">Цена</th><th>Пост</th></tr></thead>
          <tbody>
            {order.placements.map((p) => {
              const st = PLACEMENT_STATUS[p.status];
              return (
                <tr key={p.id}>
                  <td><div className="row" style={{ flexWrap: "nowrap" }}><Avatar small title={p.channel.title} color={p.channel.category.color} />
                    <div>{p.channel.title}<div className="note">@{p.channel.username}{p.postIndex > 1 ? ` · пост ${p.postIndex}` : ""}</div></div></div></td>
                  <td><span className={`tag ${st.tone}`}>{st.label}</span>{p.rejectReason && <div className="note">{p.rejectReason}</div>}</td>
                  <td className="r"><span style={{ display: "inline-block", height: 6, borderRadius: 3, background: "var(--blue)", width: Math.round((p.views / maxViews) * 50), marginRight: 8, verticalAlign: "middle" }} />{fmt(p.views)}</td>
                  <td className="r">{fmt(p.clicks)}</td>
                  <td className="r">{fmt(p.price + p.fee)}</td>
                  <td>{p.postUrl ? <a href={p.postUrl} target="_blank" rel="noreferrer">Открыть</a> : <span className="note">{dateTime(p.publishedAt)}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Ваш пост</h2>
        <div className="chat"><div className="post"><div className="ad">Реклама</div>{order.adText}</div></div>
        <p className="note" style={{ margin: 0 }}>
          Ссылка: <a href={order.link} target="_blank" rel="noreferrer">{order.link}</a>
          {order.promoCode && <> · промокод <b>{order.promoCode}</b>. Продажи по промокоду считаете вы, переходы считаем мы.</>}
        </p>
      </div>
    </div>
  );
}
