import { APP_MODULES } from "@/features/modules/app-modules";
import type {
  AppModuleId,
  UserOrganization,
} from "@/features/organizations/types";

const ALL_MODULE_IDS: readonly AppModuleId[] = APP_MODULES.map(
  (appModule) => appModule.id,
);

type AccessOrganization = Pick<UserOrganization, "memberAccess">;

export function isModuleAllowed(
  organization: AccessOrganization,
  moduleId: AppModuleId,
): boolean {
  const { allowedModules } = organization.memberAccess;
  return allowedModules === null || allowedModules.includes(moduleId);
}

export function getEffectiveHiddenModules(
  organization: Pick<UserOrganization, "hiddenModules" | "memberAccess">,
): AppModuleId[] {
  return ALL_MODULE_IDS.filter(
    (moduleId) =>
      organization.hiddenModules.includes(moduleId) ||
      !isModuleAllowed(organization, moduleId),
  );
}

export function canAccessSettings(organization: AccessOrganization): boolean {
  return organization.memberAccess.canAccessSettings;
}
