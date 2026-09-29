import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { setKitchenTicketStatus } from "../actions";
import type {
  KitchenTicket,
  KitchenTicketId,
  KitchenTicketStatus,
} from "../types";
import { getKitchenTicketsQueryKey } from "./use-kitchen-tickets-query";

type SetKitchenTicketStatusVariables = {
  ticketId: KitchenTicketId;
  status: KitchenTicketStatus;
};

function applyStatus(
  tickets: KitchenTicket[],
  { ticketId, status }: SetKitchenTicketStatusVariables,
): KitchenTicket[] {
  if (status === "delivered") {
    return tickets.filter((ticket) => ticket.id !== ticketId);
  }
  return tickets.map((ticket) =>
    ticket.id === ticketId
      ? {
          ...ticket,
          status,
          readyAt: status === "ready" ? new Date().toISOString() : null,
        }
      : ticket,
  );
}

export function getSetKitchenTicketStatusMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "kitchen-tickets",
    "set-status",
  ] as const;
}

export function useSetKitchenTicketStatusMutation(
  organizationId: OrganizationId,
) {
  const queryClient = useQueryClient();
  const queryKey = getKitchenTicketsQueryKey(organizationId);

  return useMutation({
    mutationKey: getSetKitchenTicketStatusMutationKey(organizationId),
    mutationFn: async ({ ticketId, status }: SetKitchenTicketStatusVariables) =>
      unwrapActionResult(await setKitchenTicketStatus(ticketId, status)),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousTickets =
        queryClient.getQueryData<KitchenTicket[]>(queryKey);
      queryClient.setQueryData<KitchenTicket[]>(queryKey, (tickets) =>
        tickets ? applyStatus(tickets, variables) : tickets,
      );
      return { previousTickets };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previousTickets);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
