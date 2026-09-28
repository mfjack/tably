import type { Metadata } from "next";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { ResetPasswordForm } from "./components/reset-password-form";

export const metadata: Metadata = { title: "Nova senha" };

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-10">
      <AuthHeader
        title="Crie uma nova senha"
        description="Escolha uma senha que você ainda não usou aqui."
      />
      <ResetPasswordForm />
    </div>
  );
}
