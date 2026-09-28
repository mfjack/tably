import type { Metadata } from "next";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { getUserOrganizations } from "@/features/organizations/queries";
import { CreateOrganizationForm } from "./components/create-organization-form";

export const metadata: Metadata = { title: "Novo estabelecimento" };

export default async function NewOrganizationPage() {
  const organizations = await getUserOrganizations();
  const isFirstOrganization = organizations.length === 0;

  return (
    <div className="flex flex-col gap-10">
      <AuthHeader
        title={
          isFirstOrganization
            ? "Vamos cadastrar seu estabelecimento"
            : "Novo estabelecimento"
        }
        description="Comece pelo nome. Todo o resto você ajusta depois nas Configurações."
      />
      <CreateOrganizationForm canCancel={!isFirstOrganization} />
    </div>
  );
}
