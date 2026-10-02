"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { PasswordField } from "@/components/form/password-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { GoogleSignIn } from "@/features/auth/components/google-sign-in";
import { useSignInMutation } from "@/features/auth/hooks/use-sign-in-mutation";
import { type SignInInput, signInSchema } from "@/features/auth/schemas";
import { LegalNotice } from "@/features/legal/components/legal-notice";
import { ROUTES } from "@/lib/routes";
import { getSafeRedirectPath } from "@/lib/safe-redirect";

type SignInFormProps = {
  nextPath?: string;
  initialErrorMessage?: string;
};

export function SignInForm({ nextPath, initialErrorMessage }: SignInFormProps) {
  const router = useRouter();
  const signInMutation = useSignInMutation();
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const errorMessage = signInMutation.error?.message ?? initialErrorMessage;

  const handleSubmit = form.handleSubmit((values) => {
    signInMutation.mutate(values, {
      onSuccess: () => router.replace(getSafeRedirectPath(nextPath)),
    });
  });

  return (
    <div className="flex flex-col gap-10">
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
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
            autoComplete="current-password"
            labelAction={
              <Link
                href={ROUTES.forgotPassword}
                className="font-medium text-primary text-sm hover:underline"
              >
                Esqueci a senha
              </Link>
            }
          />

          {errorMessage && <AuthAlert>{errorMessage}</AuthAlert>}

          <div className="flex flex-col gap-5 pt-5">
            <AuthSubmitButton isPending={signInMutation.isPending}>
              Entrar
            </AuthSubmitButton>
            <GoogleSignIn label="Entrar com Google" nextPath={nextPath} />
          </div>
        </FieldGroup>
      </form>

      <div className="flex flex-col items-center gap-3">
        <AuthFooterLink
          question="Ainda não tem conta?"
          href={ROUTES.signUp}
          linkLabel="Criar conta"
        />
        <LegalNotice actionLabel="Ao continuar" />
      </div>
    </div>
  );
}
