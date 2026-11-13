"use client";

import { useEffect, useRef } from "react";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { useThermalPrinterSettings } from "@/lib/thermal-printer";
import { useKitchenRealtime } from "../hooks/use-kitchen-realtime";
import { useKitchenTicketsQuery } from "../hooks/use-kitchen-tickets-query";
import { printKitchenTicket } from "../print-kitchen-ticket";
import type { KitchenTicketId } from "../types";

type KitchenAutoPrinterProps = {
  organizationId: OrganizationId;
  ticketBusiness: OrderTicketBusiness;
};

function AutoPrintNewTickets({
  organizationId,
  ticketBusiness,
}: KitchenAutoPrinterProps) {
  const kitchenTicketsQuery = useKitchenTicketsQuery(organizationId);
  const seenTicketIdsRef = useRef<Set<KitchenTicketId> | null>(null);
  useKitchenRealtime(organizationId);

  useEffect(() => {
    const tickets = kitchenTicketsQuery.data;
    if (!tickets) return;

    if (!seenTicketIdsRef.current) {
      seenTicketIdsRef.current = new Set(tickets.map((ticket) => ticket.id));
      return;
    }

    for (const ticket of tickets) {
      if (seenTicketIdsRef.current.has(ticket.id)) continue;
      seenTicketIdsRef.current.add(ticket.id);
      if (ticket.status === "waiting") {
        printKitchenTicket(ticket, ticketBusiness);
      }
    }
  }, [kitchenTicketsQuery.data, ticketBusiness]);

  return null;
}

export function KitchenAutoPrinter(props: KitchenAutoPrinterProps) {
  const { isEnabled, isAutoPrintEnabled } = useThermalPrinterSettings();
  if (!isEnabled || !isAutoPrintEnabled) return null;
  return <AutoPrintNewTickets {...props} />;
}
