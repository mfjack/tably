import "server-only";

import { notFound, redirect } from "next/navigation";
import { getUserOrganizationBySlug } from "@/features/organizations/queries";
import type {
  AppModuleId,
  UserOrganization,
} from "@/features/organizations/types";
import { getEffectiveHiddenModules } from "@/features/team/access";
import { APP_MODULES, buildOrganizationHomePath } from "./app-modules";

export async function requireVisibleModule(
  organizationSlug: string,
  moduleId: AppModuleId,
): Promise<UserOrganization> {
  const organization = await getUserOrganizationBySlug(organizationSlug);

  if (!organization || organization.hiddenModules.includes(moduleId)) {
    notFound();
  }

  const hiddenModules = getEffectiveHiddenModules(organization);

  if (hiddenModules.includes(moduleId)) {
    redirect(buildOrganizationHomePath(organization.slug, hiddenModules));
  }

  return organization;
}

export async function getAccessibleModuleIds(
  organization: UserOrganization,
): Promise<AppModuleId[]> {
  const hiddenModules = getEffectiveHiddenModules(organization);
  return APP_MODULES.map(({ id }) => id).filter(
    (moduleId) => !hiddenModules.includes(moduleId),
  );
}
