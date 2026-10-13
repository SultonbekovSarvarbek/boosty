import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getUser, homeFor } from "@/lib/auth";
import { logout } from "./actions/auth";
import { PlaneIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Boosty — реклама в Telegram-каналах без крипты",
  description: "Выберите каналы, оплатите в сумах и получите отчёт с просмотрами и переходами.",
};
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@600;700;800&family=Golos+Text:wght@400;500;600&display=swap" />
      </head>
      <body>
        <header className="appbar">
          <div className="appbar-in">
            <Link href="/" className="logo"><i><PlaneIcon /></i>Boosty</Link>
            <nav className="nav">
              <Link href="/catalog">Каналы</Link>
              {user?.role === "CLIENT" && <Link href="/orders">Мои заказы</Link>}
              {user?.role === "PUBLISHER" && <Link href="/publisher">Мои каналы</Link>}
              {user?.role === "OWNER" && (
                <>
                  <Link href="/owner">Панель</Link>
                  <Link href="/publisher" className="hide-sm">Заказы каналов</Link>
                  <Link href="/orders" className="hide-sm">Мои заказы</Link>
                </>
              )}
              {!user && <Link href="/register?role=PUBLISHER" className="hide-sm">Для админов каналов</Link>}
            </nav>
            <div className="spacer" />
            {user ? (
              <form action={logout} className="row">
                <Link href={homeFor(user.role)} className="note hide-sm">{user.name}</Link>
                <button className="btn sm ghost">Выйти</button>
              </form>
            ) : (
              <Link href="/login" className="btn sm">Войти</Link>
            )}
          </div>
        </header>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
