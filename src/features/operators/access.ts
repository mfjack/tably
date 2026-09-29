import { APP_MODULES } from "@/features/modules/app-modules";
import type { AppModuleId } from "@/features/organizations/types";
import type { OperatorAccess } from "./types";

const ALL_MODULE_IDS: readonly AppModuleId[] = APP_MODULES.map(
  (appModule) => appModule.id,
);

export function getEffectiveHiddenModules(
  hiddenModules: readonly AppModuleId[],
  access: OperatorAccess,
): AppModuleId[] {
  if (access.mode !== "unlocked") return [...hiddenModules];

  return ALL_MODULE_IDS.filter(
    (moduleId) =>
      hiddenModules.includes(moduleId) ||
      !access.operator.allowedModules.includes(moduleId),
  );
}

export function canAccessSettings(access: OperatorAccess): boolean {
  return access.mode !== "unlocked" || access.operator.canAccessSettings;
}
