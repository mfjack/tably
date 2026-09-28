import type { Metadata } from "next";
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

  return (
    <IngredientsView
      organizationId={organization.id}
      title={ingredientsModule.label}
      description={ingredientsModule.description}
      canManage={canManageCatalog(organization.role)}
    />
  );
}
