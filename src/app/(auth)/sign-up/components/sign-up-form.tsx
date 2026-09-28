"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { PasswordField } from "@/components/form/password-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { GoogleSignIn } from "@/features/auth/components/google-sign-in";
import { useSignUpMutation } from "@/features/auth/hooks/use-sign-up-mutation";
import { type SignUpInput, signUpSchema } from "@/features/auth/schemas";
import { EmailConfirmationNotice } from "./email-confirmation-notice";

export function SignUpForm() {
  const router = useRouter();
  const signUpMutation = useSignUpMutation();
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const handleSubmit = form.handleSubmit((values) => {
    signUpMutation.mutate(values, {
      onSuccess: ({ requiresEmailConfirmation }) => {
        if (!requiresEmailConfirmation) router.replace("/");
      },
    });
  });

  if (
    signUpMutation.data?.requiresEmailConfirmation &&
    signUpMutation.variables
  ) {
    return <EmailConfirmationNotice email={signUpMutation.variables.email} />;
  }

  return (
    <div className="flex flex-col gap-10">
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          <TextField
            control={form.control}
            name="name"
            label="Nome"
            autoComplete="name"
            placeholder="Como devemos te chamar?"
          />
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
          />
          <PasswordField
            control={form.control}
            name="password"
            label="Senha"
            autoComplete="new-password"
            description="Mínimo de 8 caracteres, com letras e números."
          />

          {signUpMutation.error && (
            <AuthAlert>{signUpMutation.error.message}</AuthAlert>
          )}

          <div className="flex flex-col gap-5 pt-5">
            <AuthSubmitButton isPending={signUpMutation.isPending}>
              Criar conta
            </AuthSubmitButton>
            <GoogleSignIn label="Cadastrar com Google" />
          </div>
        </FieldGroup>
      </form>

      <div className="flex flex-col items-center gap-3">
        <AuthFooterLink
          question="Já tem conta?"
          href="/login"
          linkLabel="Entrar"
        />
        <p className="max-w-80 text-center text-[13px] text-muted-foreground">
          Ao criar uma conta, você concorda com os Termos de Uso e a Política de
          Privacidade.
        </p>
      </div>
    </div>
  );
}
