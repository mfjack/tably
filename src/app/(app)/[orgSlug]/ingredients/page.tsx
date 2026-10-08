import type { Metadata } from "next";
import { getCurrentUser } from "@/features/auth/queries";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { getOperatorAccess } from "@/features/operators/queries";
import { canManageCatalog } from "@/features/organizations/permissions";
import { IngredientsView } from "./components/ingredients-view";

const ingredientsModule = getAppModule("ingredients");

export const metadata: Metadata = { title: ingredientsModule.label };

export default async function IngredientsPage({
  params,
}: PageProps<"/[orgSlug]/ingredients">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "ingredients");
  const [access, currentUser] = await Promise.all([
    getOperatorAccess(organization.id),
    getCurrentUser(),
  ]);
  const currentPersonName =
    access.mode === "unlocked"
      ? access.operator.name
      : (currentUser?.fullName ?? "");

  return (
    <IngredientsView
      organizationId={organization.id}
      title={ingredientsModule.label}
      description={ingredientsModule.description}
      canManage={canManageCatalog(organization.role)}
      currentPersonName={currentPersonName}
      business={{
        name: organization.name,
        taxId: organization.taxId,
        phone: organization.phone,
        address: organization.address,
      }}
    />
  );
}
