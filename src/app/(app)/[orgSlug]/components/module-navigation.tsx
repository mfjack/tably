"use client";

import { useMemo } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";
import {
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

  return moduleGroups.map((group) => (
    <SidebarGroup key={group.label} className="py-1">
      <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
        {group.label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1.5">
          {group.modules.map((appModule) => (
            <SidebarLink
              key={appModule.id}
              href={buildOrganizationPath(organizationSlug, appModule.path)}
              label={appModule.label}
              icon={appModule.icon}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ));
}
