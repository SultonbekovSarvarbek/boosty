import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmt, dateTime, ORDER_STATUS } from "@/lib/format";

export default async function OrdersPage() {
  const user = await requireUser(["CLIENT", "OWNER"]);
  const orders = await prisma.order.findMany({
    where: { clientId: user.id },
    orderBy: { createdAt: "desc" },
    include: { placements: { select: { views: true, clicks: true } } },
  });
  return (
    <>
      <div className="between" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Мои заказы</h1>
        <Link href="/catalog" className="btn">Новая реклама</Link>
      </div>
      {orders.length === 0 ? (
        <div className="card empty">Заказов пока нет. <Link href="/catalog">Выберите каналы</Link>, чтобы запустить первую рекламу.</div>
      ) : (
        <div className="tablewrap">
          <table>
            <thead><tr><th>Заказ</th><th>Статус</th><th className="r">Постов</th><th className="r">Просмотры</th><th className="r">Переходы</th><th className="r">Сумма</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/orders/${o.id}`}>{o.adText.slice(0, 40)}{o.adText.length > 40 ? "…" : ""}</Link><div className="note">{dateTime(o.createdAt)}</div></td>
                  <td><span className={`tag ${o.status === "COMPLETED" ? "good" : o.status === "AWAITING_PAYMENT" ? "warn" : o.status === "CANCELLED" ? "muted" : "blue"}`}>{ORDER_STATUS[o.status]}</span></td>
                  <td className="r">{o.placements.length}</td>
                  <td className="r">{fmt(o.placements.reduce((a, p) => a + p.views, 0))}</td>
                  <td className="r">{fmt(o.placements.reduce((a, p) => a + p.clicks, 0))}</td>
                  <td className="r">{fmt(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
