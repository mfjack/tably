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
import { OrderTabsView } from "./components/order-tabs-view";

const orderTabsModule = getAppModule("order_tabs");

export const metadata: Metadata = { title: orderTabsModule.label };

export default async function OrderTabsPage({
  params,
}: PageProps<"/[orgSlug]/order-tabs">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "order_tabs");
  const accessibleModuleIds = await getAccessibleModuleIds(organization);

  return (
    <OrderTabsView
      organizationId={organization.id}
      ticketBusiness={toOrderTicketBusiness(organization)}
      checkoutSettings={organization.checkout}
      title={orderTabsModule.label}
      description={orderTabsModule.description}
      canOpenPos={accessibleModuleIds.includes("pos")}
      posHref={buildOrganizationPath(
        organization.slug,
        getAppModule("pos").path,
      )}
    />
  );
}
