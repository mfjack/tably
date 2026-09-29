import "server-only";

import { notFound, redirect } from "next/navigation";
import { getEffectiveHiddenModules } from "@/features/operators/access";
import { getOperatorAccess } from "@/features/operators/queries";
import { getUserOrganizationBySlug } from "@/features/organizations/queries";
import type {
  AppModuleId,
  UserOrganization,
} from "@/features/organizations/types";
import { buildOrganizationHomePath } from "./app-modules";

export async function requireVisibleModule(
  organizationSlug: string,
  moduleId: AppModuleId,
): Promise<UserOrganization> {
  const organization = await getUserOrganizationBySlug(organizationSlug);

  if (!organization || organization.hiddenModules.includes(moduleId)) {
    notFound();
  }

  const access = await getOperatorAccess(organization.id);
  const hiddenModules = getEffectiveHiddenModules(
    organization.hiddenModules,
    access,
  );

  if (hiddenModules.includes(moduleId)) {
    redirect(buildOrganizationHomePath(organization.slug, hiddenModules));
  }

  return organization;
}
