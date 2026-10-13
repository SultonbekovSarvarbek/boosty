import { LoginForm } from "@/components/AuthForm";

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <div className="narrow">
      <h1>Вход</h1>
      <p className="lead">Войдите по номеру телефона.</p>
      <LoginForm next={searchParams.next} />
    </div>
  );
}
