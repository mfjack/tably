import type { Metadata } from "next";
import { getHomeOverview } from "@/features/home/overview";
import { getAppModule } from "@/features/modules/app-modules";
import {
  getAccessibleModuleIds,
  requireVisibleModule,
} from "@/features/modules/require-visible-module";
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
      organizationSlug={organization.slug}
      overview={overview}
    />
  );
}
