import type { Metadata } from "next";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { SignUpForm } from "./components/sign-up-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-10">
      <AuthHeader
        title="Crie sua conta"
        description="Leva menos de um minuto."
      />
      <SignUpForm />
    </div>
  );
}
