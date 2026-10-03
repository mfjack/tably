"use client";

import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { playNewTicketSound } from "@/features/kitchen/play-new-ticket-sound";
import { useOnlineOrdersRealtime } from "@/features/online-orders/hooks/use-online-orders-realtime";
import type { OrganizationId } from "@/features/organizations/types";

type OnlineOrdersNotifierProps = {
  organizationId: OrganizationId;
  posHref: string;
};

function OnlineOrdersListener({
  organizationId,
  posHref,
}: OnlineOrdersNotifierProps) {
  const router = useRouter();

  function openPos() {
    router.push(posHref);
  }

  function notifyNewOrder(customerName: string) {
    playNewTicketSound();
    toast(
      `Novo pedido pelo cardápio${customerName ? ` · ${customerName}` : ""}`,
      { action: { label: "Ver no PDV", onClick: openPos } },
    );
  }

  useOnlineOrdersRealtime(organizationId, notifyNewOrder);

  return null;
}

export function OnlineOrdersNotifier({
  organizationId,
  posHref,
}: OnlineOrdersNotifierProps) {
  const pathname = usePathname();
  if (pathname === posHref) return null;

  return (
    <OnlineOrdersListener organizationId={organizationId} posHref={posHref} />
  );
}
