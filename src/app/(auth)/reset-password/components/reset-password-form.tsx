"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PasswordField } from "@/components/form/password-field";
import { FieldGroup } from "@/components/ui/field";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { useResetPasswordMutation } from "@/features/auth/hooks/use-reset-password-mutation";
import {
  type ResetPasswordInput,
  resetPasswordSchema,
} from "@/features/auth/schemas";
import { ROUTES } from "@/lib/routes";

export function ResetPasswordForm() {
  const router = useRouter();
  const resetPasswordMutation = useResetPasswordMutation();
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const handleSubmit = form.handleSubmit((values) => {
    resetPasswordMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Senha atualizada.");
        router.replace(ROUTES.home);
      },
    });
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <PasswordField
          control={form.control}
          name="password"
          label="Nova senha"
          autoComplete="new-password"
          description="Mínimo de 8 caracteres, com letras e números."
        />
        <PasswordField
          control={form.control}
          name="confirmPassword"
          label="Confirme a nova senha"
          autoComplete="new-password"
        />

        {resetPasswordMutation.error && (
          <AuthAlert>{resetPasswordMutation.error.message}</AuthAlert>
        )}

        <div className="pt-3">
          <AuthSubmitButton isPending={resetPasswordMutation.isPending}>
            Salvar nova senha
          </AuthSubmitButton>
        </div>
      </FieldGroup>
    </form>
  );
}
