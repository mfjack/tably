"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { useRequestPasswordResetMutation } from "@/features/auth/hooks/use-request-password-reset-mutation";
import {
  type ForgotPasswordInput,
  forgotPasswordSchema,
} from "@/features/auth/schemas";

export function ForgotPasswordForm() {
  const requestPasswordResetMutation = useRequestPasswordResetMutation();
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const hasSentResetLink = requestPasswordResetMutation.isSuccess;

  const handleSubmit = form.handleSubmit((values) => {
    requestPasswordResetMutation.mutate(values);
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup className="gap-6">
        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
        />

        {requestPasswordResetMutation.error && (
          <AuthAlert>{requestPasswordResetMutation.error.message}</AuthAlert>
        )}
        {hasSentResetLink && (
          <AuthAlert variant="success">
            Se houver uma conta com esse email, você vai receber um link para
            criar uma nova senha em instantes.
          </AuthAlert>
        )}

        <AuthSubmitButton isPending={requestPasswordResetMutation.isPending}>
          {hasSentResetLink ? "Reenviar link" : "Enviar link de redefinição"}
        </AuthSubmitButton>

        <p className="text-muted-foreground text-sm">
          Não recebeu? Verifique a caixa de spam ou reenvie o email.
        </p>
      </FieldGroup>
    </form>
  );
}
