"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Category } from "@prisma/client";
import { Avatar } from "./Avatar";
import { VerifiedIcon } from "./icons";
import { quote, cpm, cartToString, type CartItem } from "@/lib/pricing";
import { fmt, short, plural } from "@/lib/format";

type Ch = { id: string; username: string; title: string; categoryId: string; subscribers: number; avgViews: number; price: number; isDemo: boolean };
const KEY = "boosty_cart";

export function Catalog({ categories, channels, initialCat }: { categories: Category[]; channels: Ch[]; initialCat: string }) {
  const [cat, setCat] = useState(initialCat);
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => {
    try { const saved = localStorage.getItem(KEY); if (saved) setCart(JSON.parse(saved)); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {}
  }, [cart]);

  const items: CartItem[] = Object.entries(cart).filter(([id, n]) => n > 0 && channels.some((c) => c.id === id)).map(([channelId, posts]) => ({ channelId, posts }));
  const q = useMemo(() => quote(items, channels), [items, channels]);
  const color = (id: string) => categories.find((c) => c.id === id)?.color ?? "#2aabee";
  const setN = (id: string, n: number) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(5, n)) }));
  const list = channels.filter((c) => c.categoryId === cat).sort((a, b) => cpm(a.price, a.avgViews) - cpm(b.price, b.avgViews));
  const checkout = `/order/new?items=${cartToString(items)}`;

  return (
    <div className="layout">
      <div>
        <div className="chips">
          {categories.map((c) => (
            <button key={c.id} className="chip" aria-pressed={c.id === cat} onClick={() => setCat(c.id)}>{c.name}</button>
          ))}
        </div>
        <div className="list">
          {list.length === 0 && <div className="card empty">В этой тематике пока нет каналов.</div>}
          {list.map((c) => {
            const n = cart[c.id] || 0;
            const er = Math.round((c.avgViews / c.subscribers) * 100);
            return (
              <article key={c.id} className={`ch${n ? " sel" : ""}`}>
                <div className="chtop">
                  <Avatar title={c.title} color={color(c.categoryId)} />
                  <div style={{ minWidth: 0 }}>
                    <div className="chname"><h3>{c.title}</h3>{!c.isDemo && <VerifiedIcon />}</div>
                    <div className="handle">@{c.username}</div>
                  </div>
                  <div className="price"><b className="num">{fmt(c.price)}</b><small>сум за пост</small></div>
                </div>
                <div className="stats">
                  <div className="stat"><small>Подписчики</small><b className="num">{short(c.subscribers)}</b></div>
                  <div className="stat"><small>Просмотры поста</small><b className="num">{short(c.avgViews)}</b></div>
                  <div className="stat"><small>1000 просмотров</small><b className="num">{fmt(cpm(c.price, c.avgViews))}</b></div>
                </div>
                <div className="between">
                  {er >= 20 ? <span className="tag good">Охват {er}% · хорошо</span> : <span className="tag warn">Охват {er}% · ниже среднего</span>}
                  {n ? (
                    <div className="stepper">
                      <button onClick={() => setN(c.id, n - 1)} aria-label="Меньше постов">−</button>
                      <output>{n} {plural(n, "пост", "поста", "постов")}</output>
                      <button onClick={() => setN(c.id, n + 1)} aria-label="Больше постов">+</button>
                    </div>
                  ) : (
                    <button className="btn sm" onClick={() => setN(c.id, 1)}>Добавить</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <aside className="sum" aria-live="polite">
        <h2>Ваш заказ</h2>
        {q.posts ? (
          <>
            <div className="lines">
              {items.map((i) => {
                const c = channels.find((x) => x.id === i.channelId)!;
                return <div key={i.channelId}><span>{c.title} × {i.posts}</span><span className="num">{fmt(c.price * i.posts)}</span></div>;
              })}
              <div><span>Сервис</span><span className="num">{fmt(q.fee)}</span></div>
            </div>
            <div className="total"><span>К оплате</span><b className="num">{fmt(q.total)} сум</b></div>
            <div className="views">
              <small>Ожидаемые просмотры</small>
              <b className="num">{fmt(q.low)}–{fmt(q.high)}</b>
              <small>{q.channels} {plural(q.channels, "канал", "канала", "каналов")} · {q.posts} {plural(q.posts, "пост", "поста", "постов")} · {fmt(q.cpm)} сум за 1000</small>
            </div>
            <p className="note" style={{ margin: 0 }}>Прогноз по средним просмотрам канала. Гарантируем публикацию, а не продажи.</p>
            <Link href={checkout} className="btn lg">Оформить заказ</Link>
          </>
        ) : (
          <p className="empty">Добавьте каналы, и здесь появятся цена и прогноз просмотров.</p>
        )}
      </aside>

      <div className="mob">
        {q.posts ? (
          <>
            <div><div className="t num">{fmt(q.total)} сум</div><div className="note num">≈ {fmt(q.low)}–{fmt(q.high)} просмотров</div></div>
            <Link href={checkout} className="btn">Оформить</Link>
          </>
        ) : (
          <div className="note">Добавьте хотя бы один канал</div>
        )}
      </div>
    </div>
  );
}
