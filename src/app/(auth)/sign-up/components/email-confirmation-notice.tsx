import { MailCheck } from "lucide-react";
import Link from "next/link";

type EmailConfirmationNoticeProps = {
  email: string;
};

export function EmailConfirmationNotice({
  email,
}: EmailConfirmationNoticeProps) {
  return (
    <section aria-live="polite" className="flex flex-col gap-6">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <MailCheck className="size-6" aria-hidden />
      </div>
      <p className="text-base text-muted-foreground">
        Enviamos um link de confirmação para{" "}
        <strong className="font-semibold text-foreground">{email}</strong>. Abra
        o email para ativar sua conta.
      </p>
      <Link
        href="/login"
        className="font-medium text-primary text-sm hover:underline"
      >
        Voltar para o login
      </Link>
    </section>
  );
}
