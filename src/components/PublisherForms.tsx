"use client";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { Category } from "@prisma/client";
import { addChannel, publishPlacement } from "@/app/actions/publisher";
import type { FormState } from "@/app/actions/auth";

function Submit({ label, small }: { label: string; small?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={`btn${small ? " sm" : ""}`} disabled={pending}>{pending ? "…" : label}</button>;
}

export function AddChannelForm({ categories }: { categories: Category[] }) {
  const [state, action] = useFormState<FormState, FormData>(addChannel, undefined);
  return (
    <form action={action} className="card">
      <h2>Добавить канал</h2>
      {state?.error && <div className="error">{state.error}</div>}
      {state?.ok && <div className="success">{state.ok}</div>}
      <div className="grid2">
        <label htmlFor="username">Username канала<input id="username" name="username" placeholder="@avto_news_uz" required /></label>
        <label htmlFor="title">Название<input id="title" name="title" placeholder="Авто новости UZ" required /></label>
      </div>
      <div className="grid2">
        <label htmlFor="categoryId">Тематика
          <select id="categoryId" name="categoryId" required defaultValue="">
            <option value="" disabled>Выберите</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label htmlFor="price">Цена поста, сум <span>на 24 часа</span><input id="price" name="price" inputMode="numeric" placeholder="400 000" required /></label>
      </div>
      <div className="grid2">
        <label htmlFor="subscribers">Подписчики<input id="subscribers" name="subscribers" inputMode="numeric" placeholder="40 000" required /></label>
        <label htmlFor="avgViews">Средние просмотры поста <span>за последние 20 постов</span><input id="avgViews" name="avgViews" inputMode="numeric" placeholder="8 000" required /></label>
      </div>
      <label htmlFor="rules">Что не рекламируете <span>необязательно</span><input id="rules" name="rules" placeholder="Казино, ставки, сомнительная крипта" /></label>
      <p className="note" style={{ margin: 0 }}>Мы проверим подписчиков и просмотры перед публикацией канала в каталоге.</p>
      <Submit label="Отправить на проверку" />
    </form>
  );
}

export function PublishForm({ placementId }: { placementId: string }) {
  const [state, action] = useFormState<FormState, FormData>(publishPlacement, undefined);
  return (
    <form action={action} className="stack" style={{ gap: 8 }}>
      <input type="hidden" name="placementId" value={placementId} />
      <div className="inline-form">
        <input name="postUrl" placeholder="https://t.me/канал/123" aria-label="Ссылка на опубликованный пост" required />
        <Submit small label="Опубликовал" />
      </div>
      {state?.error && <div className="error">{state.error}</div>}
      {state?.ok && <div className="success">{state.ok}</div>}
    </form>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn sm ghost"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch {}
      }}
    >
      {done ? "Скопировано" : "Скопировать пост"}
    </button>
  );
}
