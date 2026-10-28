import { useState } from "react";
import { toast } from "sonner";
import type { OrderSummaryData } from "@/features/orders/components/order-summary";
import { getChangeMessage } from "@/features/orders/order-payments";
import type { GroupedOrderTicketEntry } from "@/features/orders/print-order-ticket";
import type { OrderPaymentConfirmation } from "@/features/orders/schemas";
import type { CartTabId } from "@/features/pos/cart-store";
import { getCartLineAddonNames } from "./use-pos-catalog";
import type { GroupPlacementResult, TabOrderGroup } from "./use-pos-checkout";

const MAX_CUSTOMER_NAME_LENGTH = 60;

const QUEUED_ORDER_MESSAGE =
  "Sem internet: a venda será enviada quando a conexão voltar.";

export type GroupCheckoutMode = "kitchen" | "payment";

type GroupCheckoutFlow = {
  mode: GroupCheckoutMode;
  groups: readonly TabOrderGroup[];
  selectedKeys: ReadonlySet<string>;
};

type UseGroupCheckoutOptions = {
  placeGroupOrder: (
    group: TabOrderGroup,
    payment: OrderPaymentConfirmation | undefined,
    sendToKitchen: boolean,
  ) => Promise<GroupPlacementResult>;
  printGroupedOrders: (entries: readonly GroupedOrderTicketEntry[]) => void;
  isKitchenEnabled: boolean;
  onTabFinished: (cartTabId: CartTabId) => void;
};

function sumLines(group: TabOrderGroup) {
  return group.cartLines.reduce((total, cartLine) => total + cartLine.total, 0);
}

function getGroupTotal(group: TabOrderGroup) {
  return sumLines(group) + group.takeawayFee;
}

function toTicketEntry(group: TabOrderGroup): GroupedOrderTicketEntry {
  return {
    customerName: group.customerName,
    items: group.cartLines.map((cartLine) => ({
      name: cartLine.product.name,
      addonNames: getCartLineAddonNames(cartLine),
      quantity: cartLine.quantity,
      total: cartLine.total,
      note: cartLine.note || undefined,
    })),
    isTakeaway: group.isTakeaway,
    takeawayFee: group.takeawayFee,
    total: getGroupTotal(group),
  };
}

function getSuccessMessage(
  customerName: string,
  isPaid: boolean,
  isKitchen: boolean,
  isKitchenEnabled: boolean,
) {
  if (isPaid) {
    if (!isKitchen) return `Pagamento de ${customerName} registrado.`;
    return isKitchenEnabled
      ? `Pedido de ${customerName} pago e enviado para a cozinha.`
      : `Pedido de ${customerName} pago.`;
  }
  return isKitchen
    ? `Comanda de ${customerName} aberta.`
    : `Comanda de ${customerName} criada.`;
}

export function getGroupKey(group: TabOrderGroup): string {
  return group.cartTabIds.join("|");
}

function mergeGroups(groups: readonly TabOrderGroup[]): TabOrderGroup {
  return {
    cartTabIds: groups.flatMap((group) => group.cartTabIds),
    customerName: [...new Set(groups.map((group) => group.customerName))]
      .join(" + ")
      .slice(0, MAX_CUSTOMER_NAME_LENGTH),
    cartLines: groups.flatMap((group) => group.cartLines),
    isTakeaway: groups.some((group) => group.isTakeaway),
    isTakeawayCharged: groups.some((group) => group.isTakeawayCharged),
    takeawayFee: Math.max(...groups.map((group) => group.takeawayFee)),
  };
}

function selectFirst(groups: readonly TabOrderGroup[]): ReadonlySet<string> {
  const [firstGroup] = groups;
  return new Set(firstGroup ? [getGroupKey(firstGroup)] : []);
}

export function toGroupSummary(group: TabOrderGroup): OrderSummaryData {
  return {
    customerName: group.customerName,
    lines: group.cartLines.map((cartLine) => ({
      productId: cartLine.product.id,
      productName: cartLine.product.name,
      addonNames: getCartLineAddonNames(cartLine),
      quantity: cartLine.quantity,
      unitPrice: cartLine.unitPrice,
      rewardPrice: cartLine.product.price,
      total: cartLine.total,
    })),
    takeawayFee: group.takeawayFee,
    isTakeaway: group.isTakeaway,
    total: getGroupTotal(group),
  };
}

export function useGroupCheckout({
  placeGroupOrder,
  printGroupedOrders,
  isKitchenEnabled,
  onTabFinished,
}: UseGroupCheckoutOptions) {
  const [flow, setFlow] = useState<GroupCheckoutFlow | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const selectedGroups = flow
    ? flow.groups.filter((group) => flow.selectedKeys.has(getGroupKey(group)))
    : [];
  const currentGroup =
    selectedGroups.length > 0 ? mergeGroups(selectedGroups) : undefined;
  const summary = currentGroup ? toGroupSummary(currentGroup) : null;

  function start(groups: readonly TabOrderGroup[], mode: GroupCheckoutMode) {
    if (groups.length === 0) return;
    if (mode === "kitchen") printGroupedOrders(groups.map(toTicketEntry));
    setFlow({ mode, groups, selectedKeys: selectFirst(groups) });
  }

  function toggle(groupKey: string) {
    setFlow((currentFlow) => {
      if (!currentFlow) return currentFlow;
      const selectedKeys = new Set(currentFlow.selectedKeys);
      if (selectedKeys.has(groupKey)) selectedKeys.delete(groupKey);
      else selectedKeys.add(groupKey);
      return { ...currentFlow, selectedKeys };
    });
  }

  function cancel() {
    setFlow(null);
  }

  async function place(
    group: TabOrderGroup,
    payment: OrderPaymentConfirmation | undefined,
    isKitchen: boolean,
  ): Promise<boolean> {
    const result = await placeGroupOrder(group, payment, isKitchen);
    if (result.status === "failed") {
      toast.error(result.message);
      return false;
    }

    for (const cartTabId of group.cartTabIds) onTabFinished(cartTabId);
    toast.success(
      getSuccessMessage(
        group.customerName,
        Boolean(payment),
        isKitchen,
        isKitchenEnabled,
      ),
      {
        description:
          [
            getChangeMessage(
              payment?.payments,
              payment?.total ?? getGroupTotal(group),
            ),
            result.isQueued ? QUEUED_ORDER_MESSAGE : undefined,
          ]
            .filter(Boolean)
            .join(" ") || undefined,
      },
    );
    return true;
  }

  async function submit(payment: OrderPaymentConfirmation | undefined) {
    if (!flow || isPlacing) return;
    if (!currentGroup) {
      toast.error("Escolha pelo menos um pedido.");
      return;
    }

    setIsPlacing(true);
    const isKitchen = flow.mode === "kitchen";
    const groupsToPlace = payment ? [currentGroup] : selectedGroups;
    const placedKeys = new Set<string>();
    for (const group of groupsToPlace) {
      if (!(await place(group, payment, isKitchen))) break;
      for (const cartTabId of group.cartTabIds) placedKeys.add(cartTabId);
    }
    setIsPlacing(false);

    const remainingGroups = flow.groups.filter(
      (group) =>
        !group.cartTabIds.some((cartTabId) => placedKeys.has(cartTabId)),
    );
    if (remainingGroups.length === 0) {
      setFlow(null);
      return;
    }
    setFlow({
      ...flow,
      groups: remainingGroups,
      selectedKeys:
        remainingGroups.length === flow.groups.length
          ? flow.selectedKeys
          : selectFirst(remainingGroups),
    });
  }

  return {
    pendingGroups: flow?.groups ?? [],
    selectedKeys: flow?.selectedKeys ?? new Set<string>(),
    currentGroup,
    summary,
    mode: flow?.mode ?? "kitchen",
    isOpen: flow !== null,
    isPlacing,
    start,
    toggle,
    cancel,
    submit,
  };
}
