import type { Metadata } from "next";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { SignInForm } from "./components/sign-in-form";

export const metadata: Metadata = { title: "Entrar" };

const LOGIN_ERROR_MESSAGES = {
  "link-invalido":
    "Esse link expirou ou já foi usado. Entre com sua senha ou peça um novo link.",
} as const satisfies Record<string, string>;

function getLoginErrorMessage(errorCode: unknown): string | undefined {
  if (typeof errorCode !== "string") return undefined;
  return LOGIN_ERROR_MESSAGES[errorCode as keyof typeof LOGIN_ERROR_MESSAGES];
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next: nextPath, erro: errorCode } = await searchParams;

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
