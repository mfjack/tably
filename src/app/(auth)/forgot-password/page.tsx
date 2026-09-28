import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { ROUTES } from "@/lib/routes";
import { ForgotPasswordForm } from "./components/forgot-password-form";

export const metadata: Metadata = { title: "Esqueci a senha" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-10">
      <Link
        href={ROUTES.login}
        className="flex items-center gap-1.5 self-start font-medium text-primary text-sm hover:underline"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Voltar para o login
      </Link>
      <AuthHeader
        showLogo={false}
        title="Esqueceu a senha?"
        description="Sem problema. Informe seu email e enviaremos um link para você criar uma nova senha."
      />
      <ForgotPasswordForm />
    </div>
  );
}
