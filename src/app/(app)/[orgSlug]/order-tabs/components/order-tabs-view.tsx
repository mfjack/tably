"use client";

import { MonitorSmartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { OrderTabsBoard } from "@/features/orders/components/order-tabs/order-tabs-board";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrderTabTarget } from "@/features/orders/types";
import type {
  OrganizationCheckoutSettings,
  OrganizationId,
} from "@/features/organizations/types";
import { useCartStore } from "@/features/pos/cart-store";
import { ModuleLinkButton } from "../../components/module-link-button";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";

type OrderTabsViewProps = {
  organizationId: OrganizationId;
  ticketBusiness: OrderTicketBusiness;
  checkoutSettings: OrganizationCheckoutSettings;
  title: string;
  posHref: string;
  canOpenPos: boolean;
};

export function OrderTabsView({
  organizationId,
  ticketBusiness,
  checkoutSettings,
  title,
  posHref,
  canOpenPos,
}: OrderTabsViewProps) {
  const router = useRouter();
  const setTabTarget = useCartStore((state) => state.setTabTarget);

  function addProducts(tabTarget: OrderTabTarget) {
    setTabTarget(organizationId, tabTarget);
    router.push(posHref);
  }

  return (
    <>
      <PageHeader
        title={title}
        actions={
          canOpenPos && (
            <ModuleLinkButton
              href={posHref}
              label="PDV"
              icon={MonitorSmartphone}
            />
          )
        }
      />
      <PageContent>
        <OrderTabsBoard
          organizationId={organizationId}
          ticketBusiness={ticketBusiness}
          checkoutSettings={checkoutSettings}
          posHref={posHref}
          onAddProducts={addProducts}
        />
      </PageContent>
    </>
  );
}
