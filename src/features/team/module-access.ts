import "server-only";

import { getUserOrganizationById } from "@/features/organizations/queries";
import type {
  AppModuleId,
  OrganizationId,
} from "@/features/organizations/types";
import { canAccessSettings, isModuleAllowed } from "./access";

export const MODULE_ACCESS_DENIED_MESSAGE =
  "Você não tem acesso a essa página. Peça a liberação ao dono.";

export async function hasModuleAccess(
  organizationId: OrganizationId,
  moduleId: AppModuleId | "settings",
): Promise<boolean> {
  const organization = await getUserOrganizationById(organizationId);
  if (!organization) return false;
  if (moduleId === "settings") return canAccessSettings(organization);
  return isModuleAllowed(organization, moduleId);
}

export async function hasAnyModuleAccess(
  organizationId: OrganizationId,
  moduleIds: readonly AppModuleId[],
): Promise<boolean> {
  for (const moduleId of moduleIds) {
    if (await hasModuleAccess(organizationId, moduleId)) return true;
  }
  return false;
}

export async function hasModuleAccessToRecord(
  organizationId: string | null | undefined,
  moduleIds: AppModuleId | readonly AppModuleId[],
): Promise<boolean> {
  if (!organizationId) return false;
  return hasAnyModuleAccess(
    organizationId as OrganizationId,
    typeof moduleIds === "string" ? [moduleIds] : moduleIds,
  );
}

export async function isOrganizationOwner(
  organizationId: OrganizationId,
): Promise<boolean> {
  const organization = await getUserOrganizationById(organizationId);
  return organization?.role === "owner";
}
