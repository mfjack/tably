import type { Metadata } from "next";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { TodayView } from "./components/today-view";

const dashboardModule = getAppModule("dashboard");

export const metadata: Metadata = { title: dashboardModule.label };

export default async function TodayPage({
  params,
}: PageProps<"/[orgSlug]/today">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "dashboard");

  return (
    <TodayView
      organizationId={organization.id}
      organizationSlug={organization.slug}
      title={dashboardModule.label}
    />
  );
}
