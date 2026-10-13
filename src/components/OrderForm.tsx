"use client";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createOrder } from "@/app/actions/orders";
import type { FormState } from "@/app/actions/auth";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn lg" disabled={pending}>{pending ? "Создаём заказ…" : "Перейти к оплате"}</button>;
}

export function OrderForm({ items }: { items: string }) {
  const [state, action] = useFormState<FormState, FormData>(createOrder, undefined);
  const [text, setText] = useState("");
  return (
    <form action={action} className="stack">
      {state?.error && <div className="error">{state.error}</div>}
      <input type="hidden" name="items" value={items} />
      <div className="card">
        <label htmlFor="adText">Текст поста <span>до 1000 символов, можно эмодзи</span>
          <textarea id="adText" name="adText" maxLength={1000} required value={text} onChange={(e) => setText(e.target.value)}
            placeholder={"Например: Зимние шины со скидкой 15%! Все размеры R14–R20 в наличии…"} />
        </label>
        <div className="note" style={{ textAlign: "right", marginTop: -8 }}>{text.length} / 1000</div>
        <div className="grid2">
          <label htmlFor="link">Куда вести людей <span>сайт, бот или Instagram</span><input id="link" name="link" placeholder="t.me/vash_bot" required /></label>
          <label htmlFor="promoCode">Промокод <span>необязательно, чтобы видеть продажи</span><input id="promoCode" name="promoCode" placeholder="SHINA15" /></label>
        </div>
        <label htmlFor="desiredDate">Желаемая дата <span>точное время подтвердит админ</span><input id="desiredDate" name="desiredDate" type="date" /></label>
      </div>
      <div className="sectionhead" style={{ marginTop: 6 }}><h2>Так увидят подписчики</h2></div>
      <div className="chat">
        <div className="post"><div className="ad">Реклама</div>{text || "Здесь появится ваш текст"}
          <div style={{ color: "var(--blue)" }}>boosty.uz/r/…</div>
          <div className="foot"><span>👁 —</span><span>сейчас</span></div>
        </div>
      </div>
      <p className="note">Ваша ссылка заменится на короткую ссылку Boosty, чтобы считать переходы из каждого канала.</p>
      <Submit />
    </form>
  );
}
