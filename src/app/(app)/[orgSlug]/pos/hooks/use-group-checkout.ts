import { useState } from "react";
import { toast } from "sonner";
import type { OrderSummaryData } from "@/features/orders/components/order-summary";
import { getChangeMessage } from "@/features/orders/order-payments";
import type { GroupedOrderTicketEntry } from "@/features/orders/print-order-ticket";
import type { OrderPaymentConfirmation } from "@/features/orders/schemas";
import type { CartTabId } from "@/features/pos/cart-store";
import type { GroupPlacementResult, TabOrderGroup } from "./use-pos-checkout";

const QUEUED_ORDER_MESSAGE =
  "Sem internet: a venda será enviada quando a conexão voltar.";

export type GroupCheckoutMode = "kitchen" | "payment";

type GroupCheckoutFlow = {
  mode: GroupCheckoutMode;
  groups: readonly TabOrderGroup[];
  index: number;
};

type UseGroupCheckoutOptions = {
  placeGroupOrder: (
    group: TabOrderGroup,
    payment: OrderPaymentConfirmation | undefined,
    sendToKitchen: boolean,
  ) => Promise<GroupPlacementResult>;
  printGroupedOrders: (entries: readonly GroupedOrderTicketEntry[]) => void;
  onTabFinished: (cartTabId: CartTabId) => void;
};

function sumLines(group: TabOrderGroup) {
  return group.cartLines.reduce((total, cartLine) => total + cartLine.total, 0);
}

function toTicketEntry(group: TabOrderGroup): GroupedOrderTicketEntry {
  return {
    customerName: group.customerName,
    items: group.cartLines.map((cartLine) => ({
      name: cartLine.product.name,
      quantity: cartLine.quantity,
      total: cartLine.total,
      note: cartLine.note || undefined,
    })),
    total: sumLines(group),
  };
}

function getSuccessMessage(
  customerName: string,
  isPaid: boolean,
  isKitchen: boolean,
) {
  if (isPaid) {
    return isKitchen
      ? `Pedido de ${customerName} pago e enviado para a cozinha.`
      : `Pagamento de ${customerName} registrado.`;
  }
  return isKitchen
    ? `Comanda de ${customerName} aberta.`
    : `Comanda de ${customerName} criada.`;
}

export function useGroupCheckout({
  placeGroupOrder,
  printGroupedOrders,
  onTabFinished,
}: UseGroupCheckoutOptions) {
  const [flow, setFlow] = useState<GroupCheckoutFlow | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const currentGroup = flow ? flow.groups[flow.index] : undefined;

  const summary: OrderSummaryData | null = currentGroup
    ? {
        customerName: currentGroup.customerName,
        lines: currentGroup.cartLines.map((cartLine) => ({
          productName: cartLine.product.name,
          quantity: cartLine.quantity,
          total: cartLine.total,
        })),
        takeawayFee: 0,
        total: sumLines(currentGroup),
      }
    : null;

  function start(groups: readonly TabOrderGroup[], mode: GroupCheckoutMode) {
    if (groups.length === 0) return;
    if (mode === "kitchen") printGroupedOrders(groups.map(toTicketEntry));
    setFlow({ mode, groups, index: 0 });
  }

  function finish() {
    setFlow(null);
  }

  function cancel() {
    finish();
  }

  async function submit(payment: OrderPaymentConfirmation | undefined) {
    if (!flow || !currentGroup || isPlacing) return;

    setIsPlacing(true);
    const isKitchen = flow.mode === "kitchen";
    const result = await placeGroupOrder(currentGroup, payment, isKitchen);
    setIsPlacing(false);

    if (result.status === "failed") {
      toast.error(result.message);
      return;
    }

    onTabFinished(currentGroup.cartTabId);
    toast.success(
      getSuccessMessage(currentGroup.customerName, Boolean(payment), isKitchen),
      {
        description:
          [
            getChangeMessage(
              payment?.payments,
              payment?.total ?? sumLines(currentGroup),
            ),
            result.isQueued ? QUEUED_ORDER_MESSAGE : undefined,
          ]
            .filter(Boolean)
            .join(" ") || undefined,
      },
    );

    const nextIndex = flow.index + 1;

    if (nextIndex >= flow.groups.length) {
      finish();
      return;
    }

    setFlow({ ...flow, index: nextIndex });
  }

  return {
    currentGroup,
    summary,
    mode: flow?.mode ?? "kitchen",
    position: flow ? flow.index + 1 : 0,
    groupCount: flow?.groups.length ?? 0,
    isPlacing,
    start,
    cancel,
    submit,
  };
}
