import { RegisterForm } from "@/components/AuthForm";

export default function RegisterPage({ searchParams }: { searchParams: { role?: string; next?: string } }) {
  const role = searchParams.role === "PUBLISHER" ? "PUBLISHER" : "CLIENT";
  return (
    <div className="narrow">
      <h1>Регистрация</h1>
      <p className="lead">
        {role === "PUBLISHER"
          ? "Добавьте свой канал, получайте заказы на рекламу и выплаты без переписок."
          : "Запускайте рекламу в Telegram-каналах и платите в сумах."}
      </p>
      <RegisterForm role={role} next={searchParams.next} />
    </div>
  );
}
