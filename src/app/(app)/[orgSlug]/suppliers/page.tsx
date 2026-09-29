import type { Metadata } from "next";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { canManageCatalog } from "@/features/organizations/permissions";
import { SuppliersView } from "./components/suppliers-view";

const suppliersModule = getAppModule("suppliers");

export const metadata: Metadata = { title: suppliersModule.label };

export default async function SuppliersPage({
  params,
}: PageProps<"/[orgSlug]/suppliers">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "suppliers");

  return (
    <SuppliersView
      organizationId={organization.id}
      title={suppliersModule.label}
      description={suppliersModule.description}
      canManage={canManageCatalog(organization.role)}
    />
  );
}
