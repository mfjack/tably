import { notFound } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/features/auth/queries";
import {
  canAccessSettings,
  getEffectiveHiddenModules,
} from "@/features/operators/access";
import { getOperatorAccess } from "@/features/operators/queries";
import {
  getUserOrganizationBySlug,
  getUserOrganizations,
} from "@/features/organizations/queries";
import { AppSidebar } from "./components/app-sidebar";
import { OfflineOrderSync } from "./components/offline-order-sync";
import { OperatorLockScreen } from "./components/operator-lock-screen";
import { ServerDataRefresher } from "./components/server-data-refresher";
import { SidebarOverlay } from "./components/sidebar-overlay";

export default async function OrganizationLayout({
  children,
  params,
}: LayoutProps<"/[orgSlug]">) {
  const { orgSlug } = await params;
  const [organization, organizations, currentUser] = await Promise.all([
    getUserOrganizationBySlug(orgSlug),
    getUserOrganizations(),
    getCurrentUser(),
  ]);

  if (!organization || !currentUser) notFound();

  const access = await getOperatorAccess(organization.id);

  if (access.mode === "locked") {
    return (
      <>
        <OperatorLockScreen
          organizationId={organization.id}
          organizationName={organization.name}
          operators={access.operators}
        />
        <ServerDataRefresher />
        <OfflineOrderSync />
      </>
    );
  }

  return (
    <SidebarProvider
      defaultOpen={false}
      className="[&_[data-slot=sidebar-gap]]:w-(--sidebar-width-icon)!"
    >
      <AppSidebar
        organization={organization}
        organizations={organizations}
        currentUser={currentUser}
        hiddenModules={getEffectiveHiddenModules(
          organization.hiddenModules,
          access,
        )}
        canAccessSettings={canAccessSettings(access)}
        activeOperatorName={
          access.mode === "unlocked" ? access.operator.name : null
        }
      />
      <SidebarInset>{children}</SidebarInset>
      <SidebarOverlay />
      <ServerDataRefresher />
      <OfflineOrderSync />
    </SidebarProvider>
  );
}
