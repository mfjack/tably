import type { Metadata } from "next";
import { AuthHeader } from "@/features/auth/components/auth-header";
import {
  describePlanSelection,
  parsePlanSelection,
} from "@/features/subscriptions/plans";
import { SignUpForm } from "./components/sign-up-form";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage({
  searchParams,
}: PageProps<"/sign-up">) {
  const { plan, cycle } = await searchParams;
  const planSelection = parsePlanSelection(plan, cycle);

  return (
    <div className="flex flex-col gap-10">
      <AuthHeader
        title="Crie sua conta"
        description={
          planSelection
            ? `${describePlanSelection(planSelection)}. Teste grátis por 14 dias.`
            : "Leva menos de um minuto."
        }
      />
      <SignUpForm planSelection={planSelection} />
    </div>
  );
}
