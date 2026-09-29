"use client";

import { BellRing, CookingPot } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";
import { PageHeader } from "../../components/page-header";
import { KitchenColumn } from "./kitchen-column";

const ELAPSED_TIME_REFRESH_IN_MS = 30_000;

const KITCHEN_COLUMN_IDS = ["preparing", "ready"] as const;

type KitchenColumnId = (typeof KITCHEN_COLUMN_IDS)[number];

function isKitchenColumnId(value: string): value is KitchenColumnId {
  return KITCHEN_COLUMN_IDS.some((columnId) => columnId === value);
}

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
  const [mobileColumn, setMobileColumn] =
    useState<KitchenColumnId>("preparing");
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
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <Tabs
              value={mobileColumn}
              onValueChange={(value: string) => {
                if (isKitchenColumnId(value)) setMobileColumn(value);
              }}
              className="md:hidden"
            >
              <TabsList className="w-full group-data-horizontal/tabs:h-10">
                <TabsTrigger value="preparing">
                  Em preparo
                  <span className="text-muted-foreground tabular-nums">
                    {preparingTickets.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="ready">
                  Prontos
                  <span className="text-muted-foreground tabular-nums">
                    {readyTickets.length}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2 lg:grid-cols-[3fr_2fr]">
              <KitchenColumn
                title="Em preparo"
                className={cn(mobileColumn !== "preparing" && "hidden md:flex")}
                emptyMessage="Nenhum pedido em preparo."
                icon={CookingPot}
                tickets={preparingTickets}
                isLoading={isLoading}
                now={now}
                onChangeStatus={changeStatus}
              />
              <KitchenColumn
                title="Prontos"
                className={cn(mobileColumn !== "ready" && "hidden md:flex")}
                emptyMessage="Os pedidos prontos aparecem aqui até serem entregues."
                icon={BellRing}
                tickets={readyTickets}
                isLoading={isLoading}
                now={now}
                onChangeStatus={changeStatus}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
