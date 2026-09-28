import type { Metadata } from "next";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import type { AppModuleId } from "@/features/organizations/types";
import { ModuleComingSoon } from "./module-coming-soon";

type OrganizationPageProps = {
  params: Promise<{ orgSlug: string }>;
};

export function createComingSoonModulePage(moduleId: AppModuleId) {
  const appModule = getAppModule(moduleId);

  const metadata: Metadata = { title: appModule.label };

  async function ComingSoonModulePage({ params }: OrganizationPageProps) {
    const { orgSlug } = await params;
    await requireVisibleModule(orgSlug, moduleId);

    return (
      <ModuleComingSoon
        label={appModule.label}
        description={appModule.description}
        icon={appModule.icon}
      />
    );
  }

  return { metadata, ComingSoonModulePage };
}
