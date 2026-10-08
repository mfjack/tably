import { useEffect, useRef } from "react";
import type { KitchenTicket, KitchenTicketId } from "../types";

export function useNewTicketAlert(
  tickets: readonly KitchenTicket[] | undefined,
  onNewTicket: () => void,
) {
  const knownTicketIdsRef = useRef<Set<KitchenTicketId> | null>(null);

  useEffect(() => {
    if (!tickets) return;
    const knownTicketIds = knownTicketIdsRef.current;
    const hasNewTicket =
      knownTicketIds !== null &&
      tickets.some(
        (ticket) =>
          ticket.status === "waiting" && !knownTicketIds.has(ticket.id),
      );
    knownTicketIdsRef.current = new Set(tickets.map((ticket) => ticket.id));
    if (hasNewTicket) onNewTicket();
  }, [tickets, onNewTicket]);
}
