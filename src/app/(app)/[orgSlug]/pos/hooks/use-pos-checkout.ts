import { onlineManager } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { OrderSummaryData } from "@/features/orders/components/order-summary";
import { useAddOrderItemsMutation } from "@/features/orders/hooks/use-add-order-items-mutation";
import { usePlaceOrderMutation } from "@/features/orders/hooks/use-place-order-mutation";
import {
  type OrderTicketBusiness,
  printOrderTicket,
} from "@/features/orders/print-order-ticket";
import type {
  OrderCustomerInput,
  OrderPaymentInput,
  PlaceOrderInput,
} from "@/features/orders/schemas";
import type { OrderTabTarget } from "@/features/orders/types";
import type { OrganizationId } from "@/features/organizations/types";
import type { Cart } from "@/features/pos/cart-store";
import {
  createOrderRequestId,
  useOfflineOrderQueue,
} from "@/features/pos/offline-order-queue";
import { formatCurrency } from "@/lib/format";
import { isNetworkError } from "@/lib/network-error";
import type { CartLine } from "./use-pos-catalog";

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
  onOrderPlaced: () => void;
  onItemsAddedToTab: () => void;
};

type OrderPlacement = {
  total: number;
  isQueued: boolean;
};

type OrderSubmission = {
  input: PlaceOrderInput;
  customerName: string | null;
  localTotal: number;
  onPlaced: (placement: OrderPlacement) => void;
};

const QUEUED_ORDER_MESSAGE =
  "Sem internet: a venda será enviada quando a conexão voltar.";

function getChangeMessage(
  payment: OrderPaymentInput | undefined,
  orderTotal: number,
) {
  if (payment?.method !== "cash" || payment.amountReceived === undefined) {
    return undefined;
  }
  const change = payment.amountReceived - orderTotal;
  return change > 0 ? `Troco: ${formatCurrency(change)}` : undefined;
}

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
      productName: cartLine.product.name,
      quantity: cartLine.quantity,
      total: cartLine.total,
    })),
    takeawayFee: appliedTakeawayFee,
    total: orderTotal,
  };

  const isOpeningTab =
    placeOrderMutation.isPending &&
    placeOrderMutation.variables?.input.sendToKitchen === true &&
    !placeOrderMutation.variables.input.payment;

  function buildOrderItems() {
    return cartLines.map((cartLine) => ({
      productId: cartLine.product.id,
      quantity: cartLine.quantity,
    }));
  }

  function finishCheckout() {
    onOrderPlaced();
    setCheckoutStep({ step: "idle" });
  }

  function buildTicketItems() {
    return cartLines.map((cartLine) => ({
      name: cartLine.product.name,
      quantity: cartLine.quantity,
      total: cartLine.total,
    }));
  }

  function submitOrder({
    input,
    customerName,
    localTotal,
    onPlaced,
  }: OrderSubmission) {
    const requestId = createOrderRequestId();

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
      onPlaced({ total: localTotal, isQueued: true });
    }

    if (!onlineManager.isOnline()) {
      queueOrder();
      return;
    }

    placeOrderMutation.mutate(
      { input, request: { requestId } },
      {
        onSuccess: (placedOrder) =>
          onPlaced({ total: placedOrder.total, isQueued: false }),
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

  function addToTab() {
    if (!tabTarget) return;

    const ticketItems = buildTicketItems();
    const ticketNote = cart.note.trim() || undefined;
    const items = buildOrderItems();
    const requestId = createOrderRequestId();

    function finishAddingToTab(placement: OrderPlacement) {
      if (!tabTarget) return;
      onItemsAddedToTab();
      toast.success(
        `Produtos adicionados à comanda de ${tabTarget.customerName}.`,
        { description: buildToastDescription(placement) },
      );
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
      finishAddingToTab({ total: subtotal, isQueued: true });
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
          finishAddingToTab({ total: subtotal, isQueued: false }),
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
    payment: OrderPaymentInput | undefined,
  ) {
    const ticketItems = buildTicketItems();
    const ticketNote = cart.note.trim() || undefined;
    const ticketTakeawayFee = customer.isTakeaway ? takeawayFee : 0;

    submitOrder({
      input: {
        items: buildOrderItems(),
        note: cart.note,
        customer,
        payment,
        sendToKitchen: true,
      },
      customerName: customer.customerName,
      localTotal: subtotal + ticketTakeawayFee,
      onPlaced: (placement) => {
        finishCheckout();
        toast.success(
          payment
            ? `Pedido de ${customer.customerName} pago e enviado para a cozinha.`
            : `Comanda de ${customer.customerName} aberta.`,
          {
            description: buildToastDescription(
              placement,
              getChangeMessage(payment, placement.total),
            ),
          },
        );
        printOrderTicket({
          business: ticketBusiness,
          customerName: customer.customerName,
          items: ticketItems,
          subtotal,
          takeawayFee: ticketTakeawayFee,
          total: placement.total,
          note: ticketNote,
          createdAt: new Date(),
        });
      },
    });
  }

  function confirmQuickPayment(payment: OrderPaymentInput) {
    submitOrder({
      input: {
        items: buildOrderItems(),
        note: cart.note,
        payment,
        sendToKitchen: false,
      },
      customerName: null,
      localTotal: subtotal,
      onPlaced: (placement) => {
        finishCheckout();
        toast.success(
          payment.method === "customer_account"
            ? "Venda lançada na conta do cliente."
            : "Pagamento registrado.",
          {
            description: buildToastDescription(
              placement,
              getChangeMessage(payment, placement.total),
            ),
          },
        );
      },
    });
  }

  function confirmPayment(payment: OrderPaymentInput) {
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
        finishCheckout();
        toast.success(`Comanda de ${customerName} criada.`, {
          description: buildToastDescription(placement),
        });
      },
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
    addToTab,
    startKitchenCheckout: () => setCheckoutStep({ step: "customer" }),
    startQuickPayment: () => setCheckoutStep({ step: "quick-payment" }),
    startTabCreation: () => setCheckoutStep({ step: "tab-name" }),
    createTab,
    confirmCustomer: (customer: OrderCustomerInput) =>
      setCheckoutStep({ step: "kitchen-payment", customer }),
    confirmPayment,
    openKitchenTab,
    cancelCheckout: () => setCheckoutStep({ step: "idle" }),
  };
}
