import "server-only";

import { notFound } from "next/navigation";
import { getUserOrganizationBySlug } from "@/features/organizations/queries";
import type {
  AppModuleId,
  UserOrganization,
} from "@/features/organizations/types";

export async function requireVisibleModule(
  organizationSlug: string,
  moduleId: AppModuleId,
): Promise<UserOrganization> {
  const organization = await getUserOrganizationBySlug(organizationSlug);

  if (!organization || organization.hiddenModules.includes(moduleId)) {
    notFound();
  }

  return organization;
}
