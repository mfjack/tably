import type { Metadata } from "next";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { LOGIN_ERROR_CODES } from "@/lib/routes";
import { SignInForm } from "./components/sign-in-form";

export const metadata: Metadata = { title: "Entrar" };

const LOGIN_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  [LOGIN_ERROR_CODES.invalidLink]:
    "Esse link expirou ou já foi usado. Entre com sua senha ou peça um novo link.",
};

function getLoginErrorMessage(errorCode: unknown): string | undefined {
  if (typeof errorCode !== "string") return undefined;
  return LOGIN_ERROR_MESSAGES[errorCode];
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next: nextPath, error: errorCode } = await searchParams;

  return (
    <div className="flex flex-col gap-10">
      <AuthHeader
        title="Bem-vindo de volta"
        description="Entre para continuar de onde parou."
      />
      <SignInForm
        nextPath={typeof nextPath === "string" ? nextPath : undefined}
        initialErrorMessage={getLoginErrorMessage(errorCode)}
      />
    </div>
  );
}
