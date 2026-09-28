import type { Metadata } from "next";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { canManageCatalog } from "@/features/organizations/permissions";
import { CategoriesView } from "./components/categories-view";

const categoriesModule = getAppModule("categories");

export const metadata: Metadata = { title: categoriesModule.label };

export default async function CategoriesPage({
  params,
}: PageProps<"/[orgSlug]/categories">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "categories");

  return (
    <CategoriesView
      organizationId={organization.id}
      title={categoriesModule.label}
      description={categoriesModule.description}
      canManage={canManageCatalog(organization.role)}
    />
  );
}
