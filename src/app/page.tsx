import Link from "next/link";
import { prisma } from "@/lib/db";
import { plural } from "@/lib/format";

export default async function Home() {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({ orderBy: { sort: "asc" } }),
    prisma.channel.groupBy({ by: ["categoryId"], where: { status: "APPROVED" }, _count: true }),
  ]);
  const total = counts.reduce((a, c) => a + c._count, 0);
  const countFor = (id: string) => counts.find((c) => c.categoryId === id)?._count ?? 0;

  return (
    <>
      <section className="hero">
        <div>
          <h1>Реклама в Telegram&#8209;каналах Узбекистана <em>без крипты</em></h1>
          <p className="lead">
            Выберите каналы, загрузите пост и оплатите в сумах. Мы передадим заказ админам, проверим публикацию и
            пришлём отчёт с просмотрами и переходами.
          </p>
          <div className="pills">
            <span className="pill">Оплата Click, Payme, Uzcard</span>
            <span className="pill">{total} {plural(total, "проверенный канал", "проверенных канала", "проверенных каналов")}</span>
            <span className="pill">Возврат, если пост не вышел</span>
          </div>
          <Link href="/catalog" className="btn lg">Запустить рекламу</Link>
        </div>
        <div className="chat" aria-hidden="true">
          <div className="chathead">
            <div className="ava sm" style={{ background: "linear-gradient(135deg,#37aee2,#1e96c8)" }}>АН</div>
            <div><b>Авто новости</b><small>80 000 подписчиков</small></div>
          </div>
          <div className="post">
            <div className="ad">Реклама</div>
            Зимние шины со скидкой 15%! Все размеры R14–R20 в наличии. Бесплатный шиномонтаж при покупке комплекта.
            <div style={{ color: "var(--blue)" }}>boosty.uz/r/7Fq2</div>
            <div className="foot"><span>👁 15,2K</span><span>14:20</span></div>
          </div>
          <div className="post" style={{ opacity: 0.55 }}>
            Новый Chevrolet Tracker: цены и комплектации
            <div className="foot"><span>👁 14,1K</span><span>12:05</span></div>
          </div>
        </div>
      </section>

      <div className="how">
        <div><i>1</i><b>Выберите каналы</b><span>По тематике, с реальными просмотрами и ценой</span></div>
        <div><i>2</i><b>Загрузите пост</b><span>Текст и ссылка на ваш сайт или бот</span></div>
        <div><i>3</i><b>Оплатите в сумах</b><span>Деньги заморожены до публикации</span></div>
        <div><i>4</i><b>Получите отчёт</b><span>Просмотры и переходы через 24 часа</span></div>
      </div>

      <div className="sectionhead"><h2>Тематики</h2><span className="note">Нажмите, чтобы посмотреть каналы</span></div>
      <div className="cats">
        {categories.map((c) => {
          const n = countFor(c.id);
          return (
            <Link key={c.id} href={`/catalog?cat=${c.id}`} className="cat">
              <span className="ci" style={{ background: c.color }}>{c.name[0]}</span>
              <b>{c.name}</b>
              <small>{n} {plural(n, "канал", "канала", "каналов")} · {c.hint}</small>
            </Link>
          );
        })}
      </div>

      <div className="sectionhead"><h2>У вас есть канал?</h2></div>
      <div className="card between">
        <p style={{ margin: 0, maxWidth: "60ch" }}>
          Добавьте канал в Boosty: заказы приходят в Telegram-бот, вы нажимаете «Принять», публикуете пост и получаете
          деньги после 24 часов. Без переписок и споров об оплате.
        </p>
        <Link href="/register?role=PUBLISHER" className="btn ghost">Добавить канал</Link>
      </div>
    </>
  );
}
