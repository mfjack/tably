import type { Metadata } from "next";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { toOrderTicketBusiness } from "@/features/orders/print-order-ticket";
import { KitchenView } from "./components/kitchen-view";

const kitchenModule = getAppModule("kitchen");

export const metadata: Metadata = { title: kitchenModule.label };

export default async function KitchenPage({
  params,
}: PageProps<"/[orgSlug]/kitchen">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "kitchen");

  return (
    <KitchenView
      organizationId={organization.id}
      ticketBusiness={toOrderTicketBusiness(organization)}
      title={kitchenModule.label}
      description="Pedidos enviados pelo PDV, em tempo real."
    />
  );
}
