"use client";

import { SidebarMenu } from "@/components/ui/sidebar";
import {
  buildOrganizationPath,
  SETTINGS_PAGE,
} from "@/features/modules/app-modules";
import { SidebarCollapseButton } from "./sidebar-collapse-button";
import { SidebarLink } from "./sidebar-link";

type SettingsNavigationProps = {
  organizationSlug: string;
};

export function SettingsNavigation({
  organizationSlug,
}: SettingsNavigationProps) {
  return (
    <SidebarMenu className="gap-1.5">
      <SidebarLink
        href={buildOrganizationPath(organizationSlug, SETTINGS_PAGE.path)}
        label={SETTINGS_PAGE.label}
        icon={SETTINGS_PAGE.icon}
      />
      <SidebarCollapseButton />
    </SidebarMenu>
  );
}
