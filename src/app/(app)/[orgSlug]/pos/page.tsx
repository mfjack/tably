import type { Metadata } from "next";
import {
  buildOrganizationPath,
  getAppModule,
} from "@/features/modules/app-modules";
import {
  getAccessibleModuleIds,
  requireVisibleModule,
} from "@/features/modules/require-visible-module";
import { toOrderTicketBusiness } from "@/features/orders/print-order-ticket";
import { canManageCatalog } from "@/features/organizations/permissions";
import { PosView } from "./components/pos-view";

const posModule = getAppModule("pos");

export const metadata: Metadata = { title: posModule.label };

export default async function PosPage({ params }: PageProps<"/[orgSlug]/pos">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "pos");
  const accessibleModuleIds = await getAccessibleModuleIds(organization);

  return (
    <PosView
      organizationId={organization.id}
      organizationName={organization.name}
      ticketBusiness={toOrderTicketBusiness(organization)}
      isTakeawayEnabled={organization.isTakeawayEnabled}
      takeawayFee={organization.takeawayFee}
      checkoutSettings={organization.checkout}
      isOnlineOrderingEnabled={organization.menu.isOnlineOrderingEnabled}
      canOpenOrderTabs={accessibleModuleIds.includes("order_tabs")}
      isKitchenEnabled={!organization.hiddenModules.includes("kitchen")}
      canOrganizeProducts={canManageCatalog(organization.role)}
      stockLinks={{
        productsHref:
          accessibleModuleIds.includes("products") &&
          canManageCatalog(organization.role)
            ? buildOrganizationPath(
                organization.slug,
                getAppModule("products").path,
              )
            : null,
        ingredientsHref:
          accessibleModuleIds.includes("ingredients") &&
          canManageCatalog(organization.role)
            ? buildOrganizationPath(
                organization.slug,
                getAppModule("ingredients").path,
              )
            : null,
      }}
      kitchenHref={
        accessibleModuleIds.includes("kitchen")
          ? buildOrganizationPath(
              organization.slug,
              getAppModule("kitchen").path,
            )
          : null
      }
      printerSettingsHref={`${buildOrganizationPath(organization.slug, "settings")}?tab=printer`}
    />
  );
}
