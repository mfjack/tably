"use client";

import { BellRing, CookingPot } from "lucide-react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useKitchenRealtime } from "@/features/kitchen/hooks/use-kitchen-realtime";
import { useKitchenTicketsQuery } from "@/features/kitchen/hooks/use-kitchen-tickets-query";
import { useSetKitchenTicketStatusMutation } from "@/features/kitchen/hooks/use-set-kitchen-ticket-status-mutation";
import { playNewTicketSound } from "@/features/kitchen/play-new-ticket-sound";
import type {
  KitchenTicketId,
  KitchenTicketStatus,
} from "@/features/kitchen/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useNow } from "@/hooks/use-now";
import { PageHeader } from "../../components/page-header";
import { KitchenColumn } from "./kitchen-column";

const ELAPSED_TIME_REFRESH_IN_MS = 30_000;

type KitchenViewProps = {
  organizationId: OrganizationId;
  title: string;
  description: string;
};

export function KitchenView({
  organizationId,
  title,
  description,
}: KitchenViewProps) {
  const now = useNow(ELAPSED_TIME_REFRESH_IN_MS);
  const kitchenTicketsQuery = useKitchenTicketsQuery(organizationId);
  const setStatusMutation = useSetKitchenTicketStatusMutation(organizationId);
  const { mutate: setTicketStatus } = setStatusMutation;

  useKitchenRealtime(organizationId, playNewTicketSound);

  const { preparingTickets, readyTickets } = useMemo(() => {
    const tickets = kitchenTicketsQuery.data ?? [];
    return {
      preparingTickets: tickets.filter(
        (ticket) => ticket.status === "preparing",
      ),
      readyTickets: tickets.filter((ticket) => ticket.status === "ready"),
    };
  }, [kitchenTicketsQuery.data]);

  const changeStatus = useCallback(
    (ticketId: KitchenTicketId, status: KitchenTicketStatus) =>
      setTicketStatus(
        { ticketId, status },
        { onError: (error) => toast.error(error.message) },
      ),
    [setTicketStatus],
  );

  const isLoading = kitchenTicketsQuery.isPending;

  return (
    <div className="flex h-svh min-h-0 flex-col">
      <PageHeader title={title} description={description} />
      <main className="flex min-h-0 flex-1 flex-col px-4 py-6 md:px-8">
        {kitchenTicketsQuery.error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {kitchenTicketsQuery.error.message}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[3fr_2fr]">
            <KitchenColumn
              title="Em preparo"
              emptyMessage="Nenhum pedido em preparo."
              icon={CookingPot}
              tickets={preparingTickets}
              isLoading={isLoading}
              now={now}
              onChangeStatus={changeStatus}
            />
            <KitchenColumn
              title="Prontos"
              emptyMessage="Os pedidos prontos aparecem aqui até serem entregues."
              icon={BellRing}
              tickets={readyTickets}
              isLoading={isLoading}
              now={now}
              onChangeStatus={changeStatus}
            />
          </div>
        )}
      </main>
    </div>
  );
}
