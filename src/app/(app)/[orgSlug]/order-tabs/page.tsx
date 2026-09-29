import type { Metadata } from "next";
import {
  buildOrganizationPath,
  getAppModule,
} from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { toOrderTicketBusiness } from "@/features/orders/print-order-ticket";
import { OrderTabsView } from "./components/order-tabs-view";

const orderTabsModule = getAppModule("order_tabs");

export const metadata: Metadata = { title: orderTabsModule.label };

export default async function OrderTabsPage({
  params,
}: PageProps<"/[orgSlug]/order-tabs">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "order_tabs");

  return (
    <OrderTabsView
      organizationId={organization.id}
      ticketBusiness={toOrderTicketBusiness(organization)}
      title={orderTabsModule.label}
      description={orderTabsModule.description}
      posHref={buildOrganizationPath(
        organization.slug,
        getAppModule("pos").path,
      )}
    />
  );
}
