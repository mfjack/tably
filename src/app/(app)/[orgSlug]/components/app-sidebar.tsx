"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import type { CurrentUser } from "@/features/auth/types";
import type { UserOrganization } from "@/features/organizations/types";
import { ModuleNavigation } from "./module-navigation";
import { OrganizationSwitcher } from "./organization-switcher";
import { SettingsNavigation } from "./settings-navigation";
import { UserMenu } from "./user-menu";

type AppSidebarProps = {
  organization: UserOrganization;
  organizations: UserOrganization[];
  currentUser: CurrentUser;
};

export function AppSidebar({
  organization,
  organizations,
  currentUser,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <OrganizationSwitcher
          activeOrganization={organization}
          organizations={organizations}
        />
      </SidebarHeader>
      <SidebarContent>
        <ModuleNavigation
          organizationSlug={organization.slug}
          hiddenModules={organization.hiddenModules}
        />
      </SidebarContent>
      <SidebarFooter>
        <SettingsNavigation organizationSlug={organization.slug} />
        <UserMenu currentUser={currentUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
