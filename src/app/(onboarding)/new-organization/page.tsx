import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { getUserOrganizations } from "@/features/organizations/queries";
import {
  describePlanSelection,
  parsePlanSelection,
} from "@/features/subscriptions/plans";
import { getSignUpPlanSelection } from "@/features/subscriptions/queries";
import { ROUTES } from "@/lib/routes";
import { CreateOrganizationForm } from "./components/create-organization-form";

export const metadata: Metadata = { title: "Novo estabelecimento" };

export default async function NewOrganizationPage({
  searchParams,
}: PageProps<"/new-organization">) {
  const [{ plan, cycle }, organizations] = await Promise.all([
    searchParams,
    getUserOrganizations(),
  ]);
  const isFirstOrganization = organizations.length === 0;
  if (!isFirstOrganization && plan) redirect(ROUTES.home);

  const planSelection = isFirstOrganization
    ? (parsePlanSelection(plan, cycle) ?? (await getSignUpPlanSelection()))
    : null;

  return (
    <div className="flex flex-col gap-10">
      <AuthHeader
        title={
          isFirstOrganization
            ? "Vamos cadastrar seu estabelecimento"
            : "Novo estabelecimento"
        }
        description={
          planSelection
            ? `${describePlanSelection(planSelection)}, com 14 dias grátis. Comece pelo nome; o resto você ajusta depois nas Configurações.`
            : "Comece pelo nome. Todo o resto você ajusta depois nas Configurações."
        }
      />
      <CreateOrganizationForm
        canCancel={!isFirstOrganization}
        planSelection={planSelection}
      />
    </div>
  );
}
