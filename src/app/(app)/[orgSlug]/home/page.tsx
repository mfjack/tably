import type { Metadata } from "next";
import { getHomeOverview } from "@/features/home/overview";
import { getAppModule } from "@/features/modules/app-modules";
import {
  getAccessibleModuleIds,
  requireVisibleModule,
} from "@/features/modules/require-visible-module";
import { canManageCatalog } from "@/features/organizations/permissions";
import { HomeView } from "./components/home-view";

const homeModule = getAppModule("dashboard");

export const metadata: Metadata = { title: homeModule.label };

export default async function HomePage({
  params,
}: PageProps<"/[orgSlug]/home">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "dashboard");
  const accessibleModuleIds = await getAccessibleModuleIds(organization);
  const overview = await getHomeOverview(organization.id, accessibleModuleIds);

  return (
    <HomeView
      title={homeModule.label}
      organizationId={organization.id}
      organizationSlug={organization.slug}
      canManage={canManageCatalog(organization.role)}
      business={{
        name: organization.name,
        taxId: organization.taxId,
        phone: organization.phone,
        address: organization.address,
      }}
      overview={overview}
    />
  );
}
