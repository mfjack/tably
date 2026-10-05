"use client";

import { useMemo } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";
import {
  APP_MODULES,
  type AppModule,
  buildOrganizationPath,
  getVisibleModuleGroups,
} from "@/features/modules/app-modules";
import type { AppModuleId } from "@/features/organizations/types";
import { SidebarLink } from "./sidebar-link";

type ModuleNavigationProps = {
  organizationSlug: string;
  hiddenModules: AppModuleId[];
};

export function ModuleNavigation({
  organizationSlug,
  hiddenModules,
}: ModuleNavigationProps) {
  const moduleGroups = useMemo(
    () => getVisibleModuleGroups(hiddenModules),
    [hiddenModules],
  );

  function isMergedIntoVisibleParent(appModule: AppModule) {
    return (
      appModule.parentModuleId !== undefined &&
      !hiddenModules.includes(appModule.parentModuleId)
    );
  }

  function getChildModules(moduleId: AppModuleId) {
    return APP_MODULES.filter(
      (appModule) =>
        "parentModuleId" in appModule &&
        appModule.parentModuleId === moduleId &&
        !hiddenModules.includes(appModule.id),
    );
  }

  return moduleGroups.map((group) => (
    <SidebarGroup key={group.label} className="py-1">
      <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
        {group.label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1.5">
          {group.modules
            .filter((appModule) => !isMergedIntoVisibleParent(appModule))
            .map((appModule) => (
              <SidebarLink
                key={appModule.id}
                href={buildOrganizationPath(organizationSlug, appModule.path)}
                activeHrefs={getChildModules(appModule.id).map((childModule) =>
                  buildOrganizationPath(organizationSlug, childModule.path),
                )}
                label={appModule.label}
                icon={appModule.icon}
              />
            ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ));
}
