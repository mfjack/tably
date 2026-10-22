import "server-only";

import type {
  AppModuleId,
  OrganizationId,
} from "@/features/organizations/types";
import { canAccessSettings } from "./access";
import { getOperatorAccess } from "./queries";

export const MODULE_ACCESS_DENIED_MESSAGE =
  "Você não tem acesso a essa página. Peça a liberação ao gerente.";

export async function hasModuleAccess(
  organizationId: OrganizationId,
  moduleId: AppModuleId | "settings",
): Promise<boolean> {
  const access = await getOperatorAccess(organizationId);
  if (moduleId === "settings") return canAccessSettings(access);
  if (access.mode === "disabled") return true;
  if (access.mode === "locked") return false;
  return access.operator.allowedModules.includes(moduleId);
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
