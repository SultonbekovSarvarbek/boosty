import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { appUrl } from "@/lib/telegram";
import { fmt, sum, dateTime, PLACEMENT_STATUS } from "@/lib/format";
import { acceptPlacement, rejectPlacement, updateChannel } from "@/app/actions/publisher";
import { AddChannelForm, PublishForm, CopyButton } from "@/components/PublisherForms";
import { Avatar } from "@/components/Avatar";

const CHANNEL_STATUS: Record<string, [string, string]> = {
  PENDING: ["На проверке", "warn"],
  APPROVED: ["В каталоге", "good"],
  REJECTED: ["Отклонён", "bad"],
  PAUSED: ["На паузе", "muted"],
};

export default async function PublisherPage() {
  const user = await requireUser(["PUBLISHER", "OWNER"]);
  const [channels, categories, placements, payouts] = await Promise.all([
    prisma.channel.findMany({ where: { ownerId: user.id, isDemo: false }, include: { category: true }, orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ orderBy: { sort: "asc" } }),
    prisma.placement.findMany({
      where: { channel: { ownerId: user.id }, status: { in: ["PENDING", "ACCEPTED", "PUBLISHED"] } },
      include: { channel: true, order: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.payout.findMany({ where: { placement: { channel: { ownerId: user.id } } }, include: { placement: { include: { channel: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const earned = payouts.reduce((a, p) => a + p.amount, 0);
  const toPay = payouts.filter((p) => p.status === "PENDING").reduce((a, p) => a + p.amount, 0);
  const bot = process.env.TELEGRAM_BOT_USERNAME;

  return (
    <div className="stack">
      <h1>Кабинет админа канала</h1>

      <div className="kpis">
        <div className="kpi hl"><small>Новые заказы</small><b>{placements.filter((p) => p.status === "PENDING").length}</b></div>
        <div className="kpi"><small>Ждут публикации</small><b>{placements.filter((p) => p.status === "ACCEPTED").length}</b></div>
        <div className="kpi"><small>Заработано</small><b className="num">{fmt(earned)}</b></div>
        <div className="kpi"><small>К выплате</small><b className="num">{fmt(toPay)}</b></div>
      </div>

      {!user.telegramChatId && bot && (
        <div className="card between">
          <span>Подключите Telegram, чтобы получать новые заказы сразу в бот.</span>
          <a className="btn" href={`https://t.me/${bot}?start=${user.linkCode}`} target="_blank" rel="noreferrer">Подключить бота</a>
        </div>
      )}

      <div className="sectionhead"><h2>Заказы</h2></div>
      {placements.length === 0 && <div className="card empty">Новых заказов нет. Когда бизнес выберет ваш канал, заказ появится здесь.</div>}
      {placements.map((p) => {
        const st = PLACEMENT_STATUS[p.status];
        const postText = `${p.order.adText}\n\n${appUrl(`/r/${p.shortCode}`)}`;
        return (
          <div key={p.id} className="card">
            <div className="between">
              <div><b>@{p.channel.username}</b>{p.postIndex > 1 && <span className="note"> · пост {p.postIndex}</span>}
                <div className="note">Заказ от {dateTime(p.createdAt)}{p.order.desiredDate && ` · желаемая дата ${dateTime(p.order.desiredDate)}`}</div></div>
              <div className="row"><span className={`tag ${st.tone}`}>{st.label}</span><b className="num">{sum(p.price)}</b></div>
            </div>
            <div className="chat"><div className="post"><div className="ad">Текст для публикации</div>{postText}</div></div>
            <p className="note" style={{ margin: 0 }}>Опубликуйте текст без изменений, ссылка нужна для подсчёта переходов. Пост должен провисеть 24 часа.</p>
            <div className="row">
              <CopyButton text={postText} />
              {p.status === "PENDING" && (
                <form action={acceptPlacement}><input type="hidden" name="placementId" value={p.id} /><button className="btn sm good">Принять</button></form>
              )}
              {(p.status === "PENDING" || p.status === "ACCEPTED") && (
                <form action={rejectPlacement} className="inline-form">
                  <input type="hidden" name="placementId" value={p.id} />
                  <input name="reason" placeholder="Причина отказа" aria-label="Причина отказа" />
                  <button className="btn sm danger">Отказать</button>
                </form>
              )}
            </div>
            {p.status === "ACCEPTED" && <PublishForm placementId={p.id} />}
            {p.status === "PUBLISHED" && <div className="note">Опубликован {dateTime(p.publishedAt)} · <a href={p.postUrl!} target="_blank" rel="noreferrer">пост</a> · выплата после 24 часов</div>}
          </div>
        );
      })}

      <div className="sectionhead"><h2>Мои каналы</h2></div>
      {channels.length === 0 && <div className="card empty">Каналов пока нет. Добавьте первый ниже.</div>}
      {channels.map((c) => {
        const [label, tone] = CHANNEL_STATUS[c.status];
        return (
          <div key={c.id} className="card">
            <div className="between">
              <div className="row" style={{ flexWrap: "nowrap" }}><Avatar title={c.title} color={c.category.color} />
                <div><b>{c.title}</b><div className="note">@{c.username} · {c.category.name} · {fmt(c.subscribers)} подписчиков · ~{fmt(c.avgViews)} просмотров</div></div></div>
              <span className={`tag ${tone}`}>{label}</span>
            </div>
            <form action={updateChannel} className="inline-form">
              <input type="hidden" name="channelId" value={c.id} />
              <label className="inline-form" style={{ fontWeight: 400 }}>Цена поста <input name="price" defaultValue={c.price} inputMode="numeric" style={{ width: 140 }} /> сум</label>
              {(c.status === "APPROVED" || c.status === "PAUSED") && (
                <label className="inline-form" style={{ fontWeight: 400 }}><input type="checkbox" name="paused" defaultChecked={c.status === "PAUSED"} style={{ width: "auto" }} /> Пауза</label>
              )}
              <button className="btn sm ghost">Сохранить</button>
            </form>
          </div>
        );
      })}

      <AddChannelForm categories={categories} />

      {payouts.length > 0 && (
        <>
          <div className="sectionhead"><h2>Выплаты</h2></div>
          <div className="tablewrap"><table>
            <thead><tr><th>Канал</th><th>Дата поста</th><th>Статус</th><th className="r">Сумма</th></tr></thead>
            <tbody>{payouts.map((p) => (
              <tr key={p.id}><td>@{p.placement.channel.username}</td><td>{dateTime(p.placement.publishedAt)}</td>
                <td><span className={`tag ${p.status === "PAID" ? "good" : "warn"}`}>{p.status === "PAID" ? "Выплачено" : "К выплате"}</span></td>
                <td className="r">{fmt(p.amount)}</td></tr>))}</tbody>
          </table></div>
        </>
      )}
    </div>
  );
}
