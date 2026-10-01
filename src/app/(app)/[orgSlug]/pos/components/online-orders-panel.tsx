"use client";

import { differenceInMinutes } from "date-fns";
import { BellRing } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Button } from "@/components/ui/button";
import { playNewTicketSound } from "@/features/kitchen/play-new-ticket-sound";
import { useAcceptOnlineOrderMutation } from "@/features/online-orders/hooks/use-accept-online-order-mutation";
import { useOnlineOrdersRealtime } from "@/features/online-orders/hooks/use-online-orders-realtime";
import { usePendingOnlineOrdersQuery } from "@/features/online-orders/hooks/use-pending-online-orders-query";
import { usePosPresence } from "@/features/online-orders/hooks/use-pos-presence";
import { useRejectOnlineOrderMutation } from "@/features/online-orders/hooks/use-reject-online-order-mutation";
import type { PendingOnlineOrder } from "@/features/online-orders/types";
import {
  type OrderTicketBusiness,
  printOrderTicket,
} from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { useNow } from "@/hooks/use-now";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type OnlineOrdersPanelProps = {
  organizationId: OrganizationId;
  ticketBusiness: OrderTicketBusiness;
};

const ELAPSED_TIME_REFRESH_IN_MS = 30_000;

function formatElapsedTime(createdAt: string, now: Date) {
  const minutes = Math.max(differenceInMinutes(now, new Date(createdAt)), 0);
  return minutes === 0 ? "agora" : `há ${minutes} min`;
}

export function OnlineOrdersPanel({
  organizationId,
  ticketBusiness,
}: OnlineOrdersPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const now = useNow(ELAPSED_TIME_REFRESH_IN_MS);
  const { data: pendingOrders = [] } =
    usePendingOnlineOrdersQuery(organizationId);
  const acceptMutation = useAcceptOnlineOrderMutation(organizationId);
  const rejectMutation = useRejectOnlineOrderMutation(organizationId);
  const pendingCount = pendingOrders.length;

  usePosPresence(organizationId);
  useOnlineOrdersRealtime(organizationId, (customerName) => {
    playNewTicketSound();
    toast(
      `Novo pedido pelo cardápio${customerName ? ` · ${customerName}` : ""}`,
      {
        action: { label: "Ver", onClick: () => setIsOpen(true) },
      },
    );
  });

  function acceptOrder(order: PendingOnlineOrder) {
    acceptMutation.mutate(order.id, {
      onSuccess: ({ customerName }) => {
        printOrderTicket({
          business: ticketBusiness,
          customerName,
          items: order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            total: item.unitPrice * item.quantity,
            note: item.note ?? undefined,
          })),
          subtotal: order.total,
          takeawayFee: 0,
          total: order.total,
          note: order.note ?? undefined,
          createdAt: new Date(),
        });
        toast.success(`Comanda de ${customerName} aberta e enviada à cozinha.`);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  function rejectOrder(order: PendingOnlineOrder) {
    rejectMutation.mutate(order.id, {
      onSuccess: () =>
        toast.success(`Pedido de ${order.customerName} recusado.`),
      onError: (error) => toast.error(error.message),
    });
  }

  const decidingOrderId = acceptMutation.isPending
    ? acceptMutation.variables
    : rejectMutation.isPending
      ? rejectMutation.variables
      : null;

  return (
    <>
      <Button
        variant={pendingCount > 0 ? "default" : "outline"}
        className="relative h-11 px-3 sm:px-4"
        aria-label={`Pedidos pelo cardápio (${pendingCount})`}
        onClick={() => setIsOpen(true)}
      >
        <BellRing
          aria-hidden
          className={cn(pendingCount > 0 && "animate-pulse")}
        />
        <span className="hidden sm:inline">Pedidos</span>
        {pendingCount > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-destructive font-semibold text-white text-xs tabular-nums">
            {pendingCount}
          </span>
        )}
      </Button>

      <DetailsDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Pedidos pelo cardápio"
        size="large"
        footer={
          <Button
            variant="outline"
            className={cn(DIALOG_ACTION_BUTTON_CLASS_NAME, "col-span-2")}
            onClick={() => setIsOpen(false)}
          >
            Fechar
          </Button>
        }
      >
        {pendingCount === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">
            Nenhum pedido aguardando. Quando um cliente pedir pelo cardápio, ele
            aparece aqui com um aviso sonoro.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pendingOrders.map((order) => {
              const isDeciding = decidingOrderId === order.id;
              return (
                <li
                  key={order.id}
                  className="flex flex-col gap-3 rounded-xl border p-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-semibold text-base">
                      {order.customerName}
                    </span>
                    <span className="shrink-0 text-muted-foreground text-sm">
                      {formatElapsedTime(order.createdAt, now)}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1 text-sm">
                    {order.items.map((item) => (
                      <li
                        key={`${item.productId}-${item.note ?? ""}`}
                        className="flex justify-between gap-3"
                      >
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {order.note && (
                    <p className="rounded-lg bg-muted px-3 py-2 text-sm">
                      {order.note}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-3 border-t pt-3">
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(order.total)}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className={DIALOG_ACTION_BUTTON_CLASS_NAME}
                        disabled={decidingOrderId !== null}
                        onClick={() => rejectOrder(order)}
                      >
                        Recusar
                      </Button>
                      <Button
                        className={DIALOG_ACTION_BUTTON_CLASS_NAME}
                        disabled={decidingOrderId !== null}
                        onClick={() => acceptOrder(order)}
                      >
                        {isDeciding && acceptMutation.isPending
                          ? "Aceitando..."
                          : "Aceitar e imprimir"}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DetailsDialog>
    </>
  );
}
