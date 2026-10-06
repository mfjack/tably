import type { Metadata } from "next";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { canManageCatalog } from "@/features/organizations/permissions";
import { ProductsView } from "./components/products-view";

const productsModule = getAppModule("products");

export const metadata: Metadata = { title: productsModule.label };

export default async function ProductsPage({
  params,
}: PageProps<"/[orgSlug]/products">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "products");

  return (
    <ProductsView
      organizationId={organization.id}
      title={productsModule.label}
      description={productsModule.description}
      canManage={canManageCatalog(organization.role)}
      isAddonsEnabled={organization.checkout.isProductAddonsEnabled}
    />
  );
}
