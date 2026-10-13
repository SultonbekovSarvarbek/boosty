"use client";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { login, register, type FormState } from "@/app/actions/auth";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button className="btn lg" disabled={pending}>{pending ? "Секунду…" : children}</button>;
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useFormState<FormState, FormData>(login, undefined);
  return (
    <form action={action} className="card">
      {state?.error && <div className="error">{state.error}</div>}
      <input type="hidden" name="next" value={next ?? ""} />
      <label htmlFor="phone">Телефон<input id="phone" name="phone" type="tel" placeholder="+998 90 123 45 67" required /></label>
      <label htmlFor="password">Пароль<input id="password" name="password" type="password" required /></label>
      <Submit>Войти</Submit>
      <p className="note" style={{ margin: 0 }}>Нет аккаунта? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Зарегистрируйтесь</Link></p>
    </form>
  );
}

export function RegisterForm({ role, next }: { role: "CLIENT" | "PUBLISHER"; next?: string }) {
  const [state, action] = useFormState<FormState, FormData>(register, undefined);
  return (
    <form action={action} className="card">
      {state?.error && <div className="error">{state.error}</div>}
      <input type="hidden" name="next" value={next ?? ""} />
      <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="pay">
        <legend className="note" style={{ marginBottom: 8 }}>Кто вы?</legend>
        <label className="pm"><input type="radio" name="role" value="CLIENT" defaultChecked={role === "CLIENT"} />Бизнес, хочу рекламу</label>
        <label className="pm"><input type="radio" name="role" value="PUBLISHER" defaultChecked={role === "PUBLISHER"} />Админ канала</label>
      </fieldset>
      <label htmlFor="name">Имя или компания<input id="name" name="name" required /></label>
      <label htmlFor="phone">Телефон<input id="phone" name="phone" type="tel" placeholder="+998 90 123 45 67" required /></label>
      <label htmlFor="password">Пароль <span>не короче 6 символов</span><input id="password" name="password" type="password" minLength={6} required /></label>
      <Submit>Создать аккаунт</Submit>
      <p className="note" style={{ margin: 0 }}>Уже есть аккаунт? <Link href="/login">Войти</Link></p>
    </form>
  );
}
