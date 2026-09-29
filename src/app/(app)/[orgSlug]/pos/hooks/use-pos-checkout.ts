import { useState } from "react";
import { toast } from "sonner";
import type { OrderSummaryData } from "@/features/orders/components/order-summary";
import { useAddOrderItemsMutation } from "@/features/orders/hooks/use-add-order-items-mutation";
import { usePlaceOrderMutation } from "@/features/orders/hooks/use-place-order-mutation";
import { printOrderTicket } from "@/features/orders/print-order-ticket";
import type {
  OrderCustomerInput,
  OrderPaymentInput,
} from "@/features/orders/schemas";
import type { OrderTabTarget, PlacedOrder } from "@/features/orders/types";
import type { OrganizationId } from "@/features/organizations/types";
import type { Cart } from "@/features/pos/cart-store";
import { formatCurrency } from "@/lib/format";
import type { CartLine } from "./use-pos-catalog";

export type CheckoutStep =
  | { step: "idle" }
  | { step: "customer" }
  | { step: "kitchen-payment"; customer: OrderCustomerInput }
  | { step: "quick-payment" };

type UsePosCheckoutOptions = {
  organizationId: OrganizationId;
  organizationName: string;
  takeawayFee: number;
  cart: Cart;
  cartLines: readonly CartLine[];
  tabTarget: OrderTabTarget | null;
  onOrderPlaced: () => void;
  onItemsAddedToTab: () => void;
};

function getChangeMessage(
  payment: OrderPaymentInput | undefined,
  placedOrder: PlacedOrder,
) {
  if (payment?.method !== "cash" || payment.amountReceived === undefined) {
    return undefined;
  }
  const change = payment.amountReceived - placedOrder.total;
  return change > 0 ? `Troco: ${formatCurrency(change)}` : undefined;
}

export function usePosCheckout({
  organizationId,
  organizationName,
  takeawayFee,
  cart,
  cartLines,
  tabTarget,
  onOrderPlaced,
  onItemsAddedToTab,
}: UsePosCheckoutOptions) {
  const placeOrderMutation = usePlaceOrderMutation(organizationId);
  const addOrderItemsMutation = useAddOrderItemsMutation(organizationId);
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
    placeOrderMutation.variables?.sendToKitchen === true &&
    !placeOrderMutation.variables.payment;

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

  function addToTab() {
    if (!tabTarget) return;

    const ticketItems = buildTicketItems();
    const ticketNote = cart.note.trim() || undefined;

    addOrderItemsMutation.mutate(
      {
        orderId: tabTarget.orderId,
        items: buildOrderItems(),
        note: cart.note,
      },
      {
        onSuccess: () => {
          onItemsAddedToTab();
          toast.success(
            `Produtos adicionados à comanda de ${tabTarget.customerName}.`,
          );
          printOrderTicket({
            organizationName,
            customerName: tabTarget.customerName,
            items: ticketItems,
            subtotal,
            takeawayFee: 0,
            total: subtotal,
            note: ticketNote,
            createdAt: new Date(),
          });
        },
        onError: (error) => toast.error(error.message),
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

    placeOrderMutation.mutate(
      {
        items: buildOrderItems(),
        note: cart.note,
        customer,
        payment,
        sendToKitchen: true,
      },
      {
        onSuccess: (placedOrder) => {
          finishCheckout();
          toast.success(
            payment
              ? `Pedido de ${customer.customerName} pago e enviado para a cozinha.`
              : `Comanda de ${customer.customerName} aberta.`,
            { description: getChangeMessage(payment, placedOrder) },
          );
          printOrderTicket({
            organizationName,
            customerName: customer.customerName,
            items: ticketItems,
            subtotal,
            takeawayFee: ticketTakeawayFee,
            total: placedOrder.total,
            note: ticketNote,
            createdAt: new Date(),
          });
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function confirmQuickPayment(payment: OrderPaymentInput) {
    placeOrderMutation.mutate(
      {
        items: buildOrderItems(),
        note: cart.note,
        payment,
        sendToKitchen: false,
      },
      {
        onSuccess: (placedOrder) => {
          finishCheckout();
          toast.success("Pagamento registrado.", {
            description: getChangeMessage(payment, placedOrder),
          });
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function confirmPayment(payment: OrderPaymentInput) {
    if (checkoutStep.step === "kitchen-payment") {
      sendToKitchen(checkoutStep.customer, payment);
      return;
    }
    confirmQuickPayment(payment);
  }

  function openTab(customer: OrderCustomerInput) {
    sendToKitchen(customer, undefined);
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
    confirmCustomer: (customer: OrderCustomerInput) =>
      setCheckoutStep({ step: "kitchen-payment", customer }),
    confirmPayment,
    openTab,
    cancelCheckout: () => setCheckoutStep({ step: "idle" }),
  };
}
