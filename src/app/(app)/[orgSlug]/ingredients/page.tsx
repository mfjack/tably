import type { Metadata } from "next";
import { getCurrentUser } from "@/features/auth/queries";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { canManageCatalog } from "@/features/organizations/permissions";
import { IngredientsView } from "./components/ingredients-view";

const ingredientsModule = getAppModule("ingredients");

export const metadata: Metadata = { title: ingredientsModule.label };

export default async function IngredientsPage({
  params,
}: PageProps<"/[orgSlug]/ingredients">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "ingredients");
  const currentUser = await getCurrentUser();

  return (
    <IngredientsView
      organizationId={organization.id}
      title={ingredientsModule.label}
      canManage={canManageCatalog(organization.role)}
      currentPersonName={currentUser?.fullName ?? ""}
      business={{
        name: organization.name,
        taxId: organization.taxId,
        phone: organization.phone,
        address: organization.address,
      }}
    />
  );
}
