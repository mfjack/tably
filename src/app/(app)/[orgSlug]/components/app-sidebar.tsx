import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import type { CurrentUser } from "@/features/auth/types";
import type {
  AppModuleId,
  UserOrganization,
} from "@/features/organizations/types";
import { ModuleNavigation } from "./module-navigation";
import { OrganizationSwitcher } from "./organization-switcher";
import { SettingsNavigation } from "./settings-navigation";
import { UserMenu } from "./user-menu";

type AppSidebarProps = {
  organization: UserOrganization;
  organizations: UserOrganization[];
  currentUser: CurrentUser;
  hiddenModules: AppModuleId[];
  canAccessSettings: boolean;
  activeOperatorName: string | null;
};

export function AppSidebar({
  organization,
  organizations,
  currentUser,
  hiddenModules,
  canAccessSettings,
  activeOperatorName,
}: AppSidebarProps) {
  return (
    <Sidebar
      collapsible="icon"
      className="group-data-[state=expanded]:z-40 group-data-[state=expanded]:shadow-2xl"
    >
      <SidebarHeader>
        <OrganizationSwitcher
          activeOrganization={organization}
          organizations={organizations}
        />
      </SidebarHeader>
      <SidebarContent>
        <ModuleNavigation
          organizationSlug={organization.slug}
          hiddenModules={hiddenModules}
        />
      </SidebarContent>
      <SidebarFooter>
        <SettingsNavigation
          organizationSlug={organization.slug}
          canAccessSettings={canAccessSettings}
        />
        <UserMenu
          organizationId={organization.id}
          currentUser={currentUser}
          activeOperatorName={activeOperatorName}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
