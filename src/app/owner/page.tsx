import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmt, dateTime, ORDER_STATUS, PLACEMENT_STATUS } from "@/lib/format";
import { HOLD_HOURS } from "@/lib/orders";
import { setChannelStatus, ownerCompletePlacement, ownerFailPlacement, markPayoutPaid } from "@/app/actions/owner";

export default async function OwnerPage() {
  await requireUser(["OWNER"]);
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [pendingChannels, live, orders, payouts, paidOrders, users] = await Promise.all([
    prisma.channel.findMany({ where: { status: "PENDING" }, include: { owner: true, category: true }, orderBy: { createdAt: "asc" } }),
    prisma.placement.findMany({ where: { status: "PUBLISHED" }, include: { channel: true }, orderBy: { publishedAt: "asc" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { client: true, placements: true } }),
    prisma.payout.findMany({ where: { status: "PENDING" }, include: { placement: { include: { channel: { include: { owner: true } } } } }, orderBy: { createdAt: "asc" } }),
    prisma.order.findMany({ where: { status: { in: ["PAID", "IN_PROGRESS", "COMPLETED"] }, createdAt: { gte: since } }, select: { total: true, fee: true, refunded: true, placements: { select: { fee: true, status: true } } } }),
    prisma.user.groupBy({ by: ["role"], _count: true }),
  ]);
  const turnover = paidOrders.reduce((a, o) => a + o.total - o.refunded, 0);
  const revenue = paidOrders.reduce((a, o) => a + o.placements.filter((p) => p.status !== "REJECTED" && p.status !== "FAILED").reduce((s, p) => s + p.fee, 0), 0);
  const count = (r: string) => users.find((u) => u.role === r)?._count ?? 0;

  return (
    <div className="stack">
      <h1>Панель владельца</h1>
      <div className="kpis">
        <div className="kpi hl"><small>Оборот за 30 дней</small><b className="num">{fmt(turnover)}</b></div>
        <div className="kpi"><small>Комиссия за 30 дней</small><b className="num">{fmt(revenue)}</b></div>
        <div className="kpi"><small>К выплате админам</small><b className="num">{fmt(payouts.reduce((a, p) => a + p.amount, 0))}</b></div>
        <div className="kpi"><small>Клиентов / админов</small><b>{count("CLIENT")} / {count("PUBLISHER")}</b></div>
      </div>

      <div className="sectionhead"><h2>Каналы на проверке</h2><span className="note">Сверьте подписчиков и просмотры в TGStat или в самом канале</span></div>
      {pendingChannels.length === 0 ? <div className="card empty">Новых каналов нет.</div> : (
        <div className="tablewrap"><table>
          <thead><tr><th>Канал</th><th>Тематика</th><th className="r">Подписчики</th><th className="r">Просмотры</th><th className="r">Цена</th><th>Админ</th><th></th></tr></thead>
          <tbody>{pendingChannels.map((c) => (
            <tr key={c.id}>
              <td><a href={`https://t.me/${c.username}`} target="_blank" rel="noreferrer">@{c.username}</a><div className="note">{c.title}</div></td>
              <td>{c.category.name}</td><td className="r">{fmt(c.subscribers)}</td><td className="r">{fmt(c.avgViews)}</td><td className="r">{fmt(c.price)}</td>
              <td>{c.owner.name}<div className="note">{c.owner.phone}</div></td>
              <td><div className="row">
                <form action={setChannelStatus}><input type="hidden" name="channelId" value={c.id} /><input type="hidden" name="status" value="APPROVED" /><button className="btn sm good">Одобрить</button></form>
                <form action={setChannelStatus}><input type="hidden" name="channelId" value={c.id} /><input type="hidden" name="status" value="REJECTED" /><button className="btn sm danger">Отклонить</button></form>
              </div></td>
            </tr>))}</tbody>
        </table></div>
      )}

      <div className="sectionhead"><h2>Опубликованные посты</h2><span className="note">Воркер статистики сам закрывает посты через {HOLD_HOURS} ч; здесь можно сделать это вручную</span></div>
      {live.length === 0 ? <div className="card empty">Сейчас нет постов в работе.</div> : (
        <div className="tablewrap"><table>
          <thead><tr><th>Пост</th><th>Опубликован</th><th className="r">Просмотры</th><th className="r">Переходы</th><th></th></tr></thead>
          <tbody>{live.map((p) => {
            const ready = p.publishedAt && Date.now() - p.publishedAt.getTime() >= HOLD_HOURS * 3600 * 1000;
            return (
              <tr key={p.id}>
                <td><a href={p.postUrl!} target="_blank" rel="noreferrer">@{p.channel.username}</a></td>
                <td>{dateTime(p.publishedAt)}</td><td className="r">{fmt(p.views)}</td><td className="r">{fmt(p.clicks)}</td>
                <td><div className="row">
                  <form action={ownerCompletePlacement}><input type="hidden" name="placementId" value={p.id} /><button className="btn sm good" disabled={!ready}>Закрыть, выплатить</button></form>
                  <form action={ownerFailPlacement}><input type="hidden" name="placementId" value={p.id} /><button className="btn sm danger">Удалён, вернуть</button></form>
                </div></td>
              </tr>);
          })}</tbody>
        </table></div>
      )}

      <div className="sectionhead"><h2>Выплаты админам</h2></div>
      {payouts.length === 0 ? <div className="card empty">Всё выплачено.</div> : (
        <div className="tablewrap"><table>
          <thead><tr><th>Админ</th><th>Канал</th><th className="r">Сумма</th><th></th></tr></thead>
          <tbody>{payouts.map((p) => (
            <tr key={p.id}>
              <td>{p.placement.channel.owner.name}<div className="note">{p.placement.channel.owner.phone}</div></td>
              <td>@{p.placement.channel.username}</td><td className="r">{fmt(p.amount)}</td>
              <td><form action={markPayoutPaid}><input type="hidden" name="payoutId" value={p.id} /><button className="btn sm">Отметить выплаченным</button></form></td>
            </tr>))}</tbody>
        </table></div>
      )}

      <div className="sectionhead"><h2>Последние заказы</h2></div>
      {orders.length === 0 ? <div className="card empty">Заказов пока нет.</div> : (
        <div className="tablewrap"><table>
          <thead><tr><th>Клиент</th><th>Статус</th><th>Размещения</th><th className="r">Сумма</th><th className="r">Возврат</th></tr></thead>
          <tbody>{orders.map((o) => (
            <tr key={o.id}>
              <td><Link href={`/orders/${o.id}`}>{o.client.name}</Link><div className="note">{dateTime(o.createdAt)}</div></td>
              <td><span className="tag blue">{ORDER_STATUS[o.status]}</span></td>
              <td><div className="row">{o.placements.map((p) => <span key={p.id} className={`tag ${PLACEMENT_STATUS[p.status].tone}`}>{PLACEMENT_STATUS[p.status].label}</span>)}</div></td>
              <td className="r">{fmt(o.total)}</td><td className="r">{o.refunded ? fmt(o.refunded) : "—"}</td>
            </tr>))}</tbody>
        </table></div>
      )}
    </div>
  );
}
