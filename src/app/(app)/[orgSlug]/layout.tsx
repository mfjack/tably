import { notFound } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/features/auth/queries";
import { buildOrganizationPath } from "@/features/modules/app-modules";
import { canManageOrganization } from "@/features/organizations/permissions";
import {
  getUserOrganizationBySlug,
  getUserOrganizations,
} from "@/features/organizations/queries";
import { getSubscriptionState } from "@/features/subscriptions/subscription-state";
import {
  canAccessSettings,
  getEffectiveHiddenModules,
} from "@/features/team/access";
import { AppSidebar } from "./components/app-sidebar";
import { OfflineOrderSync } from "./components/offline-order-sync";
import { OnlineOrdersNotifier } from "./components/online-orders-notifier";
import { ServerDataRefresher } from "./components/server-data-refresher";
import { SidebarOverlay } from "./components/sidebar-overlay";
import { SubscriptionBanner } from "./components/subscription-banner";
import { SubscriptionBlockedScreen } from "./components/subscription-blocked-screen";

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

  const subscriptionState = organization.subscription
    ? getSubscriptionState(organization.subscription)
    : null;

  if (organization.subscription && subscriptionState?.status === "blocked") {
    return (
      <SubscriptionBlockedScreen
        organization={organization}
        subscription={organization.subscription}
        state={subscriptionState}
      />
    );
  }

  const hiddenModules = getEffectiveHiddenModules(organization);

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar
        organization={organization}
        organizations={organizations}
        currentUser={currentUser}
        hiddenModules={hiddenModules}
        canAccessSettings={canAccessSettings(organization)}
      />
      <SidebarInset className="h-svh overflow-hidden">
        {subscriptionState?.isExpiringSoon && (
          <SubscriptionBanner
            organizationSlug={organization.slug}
            state={subscriptionState}
            canManage={canManageOrganization(organization.role)}
          />
        )}
        {children}
      </SidebarInset>
      <SidebarOverlay />
      <ServerDataRefresher />
      <OfflineOrderSync />
      {organization.menu.isOnlineOrderingEnabled &&
        !hiddenModules.includes("pos") && (
          <OnlineOrdersNotifier
            organizationId={organization.id}
            posHref={buildOrganizationPath(organization.slug, "pos")}
          />
        )}
    </SidebarProvider>
  );
}
