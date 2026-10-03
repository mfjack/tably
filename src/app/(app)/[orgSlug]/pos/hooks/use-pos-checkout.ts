import { onlineManager } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  type CategoryOrder,
  sortByCategoryOrder,
} from "@/features/categories/category-order";
import type { OrderSummaryData } from "@/features/orders/components/order-summary";
import { useAddOrderItemsMutation } from "@/features/orders/hooks/use-add-order-items-mutation";
import { usePlaceOrderMutation } from "@/features/orders/hooks/use-place-order-mutation";
import type { OrderAdjustmentsInput } from "@/features/orders/order-adjustments";
import {
  getChangeMessage,
  isCustomerAccountOnly,
} from "@/features/orders/order-payments";
import {
  type GroupedOrderTicketEntry,
  type OrderTicketBusiness,
  printGroupedOrderTicket,
  printOrderTicket,
} from "@/features/orders/print-order-ticket";
import type {
  OrderCustomerInput,
  OrderPaymentConfirmation,
  OrderPaymentInput,
  PlaceOrderInput,
} from "@/features/orders/schemas";
import type { OrderTabTarget } from "@/features/orders/types";
import type { OrganizationId } from "@/features/organizations/types";
import type { Cart, CartTabId } from "@/features/pos/cart-store";
import {
  createOrderRequestId,
  useOfflineOrderQueue,
} from "@/features/pos/offline-order-queue";
import { isNetworkError } from "@/lib/network-error";
import type { CartLine } from "./use-pos-catalog";

export type TabOrderGroup = {
  cartTabId: CartTabId;
  customerName: string;
  cartLines: readonly CartLine[];
};

export type GroupPlacementResult =
  | { status: "placed"; isQueued: boolean }
  | { status: "failed"; message: string };

const GROUP_ORDER_ERROR_MESSAGE = "Não foi possível abrir a comanda.";

export type CheckoutStep =
  | { step: "idle" }
  | { step: "customer" }
  | { step: "kitchen-payment"; customer: OrderCustomerInput }
  | { step: "quick-payment" }
  | { step: "tab-name" };

type UsePosCheckoutOptions = {
  organizationId: OrganizationId;
  ticketBusiness: OrderTicketBusiness;
  takeawayFee: number;
  cart: Cart;
  cartLines: readonly CartLine[];
  tabTarget: OrderTabTarget | null;
  cartTabId: CartTabId | null;
  categoryOrder: CategoryOrder;
  onOrderPlaced: (cartTabId: CartTabId | null) => void;
  onItemsAddedToTab: (cartTabId: CartTabId | null) => void;
};

type OrderPlacement = {
  total: number;
  isQueued: boolean;
  cartTabId: CartTabId | null;
};

type OrderSubmission = {
  input: PlaceOrderInput;
  customerName: string | null;
  localTotal: number;
  onPlaced: (placement: OrderPlacement) => void;
};

const QUEUED_ORDER_MESSAGE =
  "Sem internet: a venda será enviada quando a conexão voltar.";

function buildToastDescription(
  placement: OrderPlacement,
  changeMessage?: string,
) {
  const messages = [
    changeMessage,
    placement.isQueued ? QUEUED_ORDER_MESSAGE : undefined,
  ].filter(Boolean);
  return messages.length > 0 ? messages.join(" ") : undefined;
}

export function usePosCheckout({
  organizationId,
  ticketBusiness,
  takeawayFee,
  cart,
  cartLines,
  tabTarget,
  cartTabId,
  categoryOrder,
  onOrderPlaced,
  onItemsAddedToTab,
}: UsePosCheckoutOptions) {
  const placeOrderMutation = usePlaceOrderMutation(organizationId);
  const addOrderItemsMutation = useAddOrderItemsMutation(organizationId);
  const enqueueOrder = useOfflineOrderQueue((state) => state.enqueueOrder);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>({
    step: "idle",
  });

  const subtotal = cartLines.reduce(
    (total, cartLine) => total + cartLine.total,
    0,
  );
  const appliedTakeawayFee =
    checkoutStep.step === "kitchen-payment" && checkoutStep.customer.isTakeaway
      ? takeawayFee
      : 0;
  const orderTotal = subtotal + appliedTakeawayFee;

  const paymentSummary: OrderSummaryData = {
    customerName:
      checkoutStep.step === "kitchen-payment"
        ? checkoutStep.customer.customerName
        : undefined,
    lines: cartLines.map((cartLine) => ({
      productId: cartLine.product.id,
      productName: cartLine.product.name,
      quantity: cartLine.quantity,
      unitPrice: cartLine.product.price,
      total: cartLine.total,
    })),
    takeawayFee: appliedTakeawayFee,
    isTakeaway:
      checkoutStep.step === "kitchen-payment" &&
      checkoutStep.customer.isTakeaway,
    total: orderTotal,
  };

  const isOpeningTab =
    placeOrderMutation.isPending &&
    placeOrderMutation.variables?.input.sendToKitchen === true &&
    !placeOrderMutation.variables.input.payments;

  function buildOrderItems() {
    return cartLines.map((cartLine) => ({
      productId: cartLine.product.id,
      quantity: cartLine.quantity,
      note: cartLine.note || undefined,
    }));
  }

  function finishCheckout(placement: OrderPlacement) {
    onOrderPlaced(placement.cartTabId);
    setCheckoutStep({ step: "idle" });
  }

  function buildTicketItems() {
    return sortByCategoryOrder(
      cartLines,
      (cartLine) => cartLine.product.categoryId,
      categoryOrder,
    ).map((cartLine) => ({
      name: cartLine.product.name,
      quantity: cartLine.quantity,
      total: cartLine.total,
      note: cartLine.note || undefined,
    }));
  }

  function submitOrder({
    input,
    customerName,
    localTotal,
    onPlaced,
  }: OrderSubmission) {
    const requestId = createOrderRequestId();
    const submittedTabId = cartTabId;

    function queueOrder() {
      enqueueOrder({
        kind: "place-order",
        requestId,
        organizationId,
        placedAt: new Date().toISOString(),
        customerName,
        total: localTotal,
        input,
      });
      onPlaced({
        total: localTotal,
        isQueued: true,
        cartTabId: submittedTabId,
      });
    }

    if (!onlineManager.isOnline()) {
      queueOrder();
      return;
    }

    placeOrderMutation.mutate(
      { input, request: { requestId } },
      {
        onSuccess: (placedOrder) =>
          onPlaced({
            total: placedOrder.total,
            isQueued: false,
            cartTabId: submittedTabId,
          }),
        onError: (error) => {
          if (isNetworkError(error)) {
            queueOrder();
            return;
          }
          toast.error(error.message);
        },
      },
    );
  }

  function addToTab(shouldPrint: boolean) {
    if (!tabTarget) return;

    const ticketItems = buildTicketItems();
    const ticketNote = cart.note.trim() || undefined;
    const items = buildOrderItems();
    const requestId = createOrderRequestId();
    const submittedTabId = cartTabId;

    function finishAddingToTab(placement: OrderPlacement) {
      if (!tabTarget) return;
      onItemsAddedToTab(placement.cartTabId);
      toast.success(
        `Produtos adicionados à comanda de ${tabTarget.customerName}.`,
        { description: buildToastDescription(placement) },
      );
      if (!shouldPrint) return;
      printOrderTicket({
        business: ticketBusiness,
        customerName: tabTarget.customerName,
        items: ticketItems,
        subtotal,
        takeawayFee: 0,
        total: subtotal,
        note: ticketNote,
        createdAt: new Date(),
      });
    }

    function queueTabItems() {
      if (!tabTarget) return;
      enqueueOrder({
        kind: "add-items",
        requestId,
        organizationId,
        placedAt: new Date().toISOString(),
        customerName: tabTarget.customerName,
        total: subtotal,
        orderId: tabTarget.orderId,
        items,
        note: cart.note,
      });
      finishAddingToTab({
        total: subtotal,
        isQueued: true,
        cartTabId: submittedTabId,
      });
    }

    if (!onlineManager.isOnline()) {
      queueTabItems();
      return;
    }

    addOrderItemsMutation.mutate(
      {
        orderId: tabTarget.orderId,
        items,
        note: cart.note,
        request: { requestId },
      },
      {
        onSuccess: () =>
          finishAddingToTab({
            total: subtotal,
            isQueued: false,
            cartTabId: submittedTabId,
          }),
        onError: (error) => {
          if (isNetworkError(error)) {
            queueTabItems();
            return;
          }
          toast.error(error.message);
        },
      },
    );
  }

  function sendToKitchen(
    customer: OrderCustomerInput,
    payment: OrderPaymentConfirmation | undefined,
  ) {
    const ticketTakeawayFee = customer.isTakeaway ? takeawayFee : 0;
    const payments = payment?.payments;

    submitOrder({
      input: {
        items: buildOrderItems(),
        note: cart.note,
        customer,
        payments,
        adjustments: payment?.adjustments,
        sendToKitchen: true,
      },
      customerName: customer.customerName,
      localTotal: payment?.total ?? subtotal + ticketTakeawayFee,
      onPlaced: (placement) => {
        finishCheckout(placement);
        toast.success(
          payments
            ? `Pedido de ${customer.customerName} pago e enviado para a cozinha.`
            : `Comanda de ${customer.customerName} aberta.`,
          {
            description: buildToastDescription(
              placement,
              getChangeMessage(payments, placement.total),
            ),
          },
        );
      },
    });
  }

  function printKitchenOrderTicket(customer: OrderCustomerInput) {
    const ticketTakeawayFee = customer.isTakeaway ? takeawayFee : 0;
    printOrderTicket({
      business: ticketBusiness,
      customerName: customer.customerName,
      items: buildTicketItems(),
      subtotal,
      takeawayFee: ticketTakeawayFee,
      total: subtotal + ticketTakeawayFee,
      note: cart.note.trim() || undefined,
      createdAt: new Date(),
    });
  }

  function confirmCustomer(customer: OrderCustomerInput) {
    printKitchenOrderTicket(customer);
    setCheckoutStep({ step: "kitchen-payment", customer });
  }

  function confirmQuickPayment({
    payments,
    adjustments,
    total,
  }: OrderPaymentConfirmation) {
    submitOrder({
      input: {
        items: buildOrderItems(),
        note: cart.note,
        payments,
        adjustments,
        sendToKitchen: false,
      },
      customerName: null,
      localTotal: total,
      onPlaced: (placement) => {
        finishCheckout(placement);
        toast.success(
          isCustomerAccountOnly(payments)
            ? "Venda lançada na conta do cliente."
            : "Pagamento registrado.",
          {
            description: buildToastDescription(
              placement,
              getChangeMessage(payments, placement.total),
            ),
          },
        );
      },
    });
  }

  function confirmPayment(
    payments: OrderPaymentInput[],
    adjustments: OrderAdjustmentsInput,
    total: number,
  ) {
    const payment = { payments, adjustments, total };
    if (checkoutStep.step === "kitchen-payment") {
      sendToKitchen(checkoutStep.customer, payment);
      return;
    }
    confirmQuickPayment(payment);
  }

  function createTab(customerName: string) {
    submitOrder({
      input: {
        items: buildOrderItems(),
        note: cart.note,
        customer: { customerName, isTakeaway: false },
        sendToKitchen: false,
      },
      customerName,
      localTotal: subtotal,
      onPlaced: (placement) => {
        finishCheckout(placement);
        toast.success(`Comanda de ${customerName} criada.`, {
          description: buildToastDescription(placement),
        });
      },
    });
  }

  async function placeGroupOrder(
    group: TabOrderGroup,
    payment: OrderPaymentConfirmation | undefined,
    sendToKitchen: boolean,
  ): Promise<GroupPlacementResult> {
    const requestId = createOrderRequestId();
    const localTotal =
      payment?.total ??
      group.cartLines.reduce((total, cartLine) => total + cartLine.total, 0);
    const input: PlaceOrderInput = {
      items: group.cartLines.map((cartLine) => ({
        productId: cartLine.product.id,
        quantity: cartLine.quantity,
        note: cartLine.note || undefined,
      })),
      customer: { customerName: group.customerName, isTakeaway: false },
      payments: payment?.payments,
      adjustments: payment?.adjustments,
      sendToKitchen,
    };

    function queueGroupOrder(): GroupPlacementResult {
      enqueueOrder({
        kind: "place-order",
        requestId,
        organizationId,
        placedAt: new Date().toISOString(),
        customerName: group.customerName,
        total: localTotal,
        input,
      });
      return { status: "placed", isQueued: true };
    }

    if (!onlineManager.isOnline()) return queueGroupOrder();

    try {
      await placeOrderMutation.mutateAsync({ input, request: { requestId } });
      return { status: "placed", isQueued: false };
    } catch (error) {
      if (isNetworkError(error)) return queueGroupOrder();
      return {
        status: "failed",
        message:
          error instanceof Error ? error.message : GROUP_ORDER_ERROR_MESSAGE,
      };
    }
  }

  function printGroupedOrders(entries: readonly GroupedOrderTicketEntry[]) {
    if (entries.length === 0) return;
    printGroupedOrderTicket({
      business: ticketBusiness,
      entries,
      createdAt: new Date(),
    });
  }

  function openKitchenTab() {
    if (checkoutStep.step !== "kitchen-payment") return;
    sendToKitchen(checkoutStep.customer, undefined);
  }

  return {
    checkoutStep,
    paymentSummary,
    isPlacingOrder: placeOrderMutation.isPending,
    isOpeningTab,
    isAddingToTab: addOrderItemsMutation.isPending,
    placeGroupOrder,
    printGroupedOrders,
    addToTab,
    startKitchenCheckout: () => setCheckoutStep({ step: "customer" }),
    startQuickPayment: () => setCheckoutStep({ step: "quick-payment" }),
    startTabCreation: () => setCheckoutStep({ step: "tab-name" }),
    createTab,
    confirmCustomer,
    confirmPayment,
    openKitchenTab,
    cancelCheckout: () => setCheckoutStep({ step: "idle" }),
  };
}
