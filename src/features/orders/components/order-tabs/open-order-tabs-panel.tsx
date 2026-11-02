"use client";

import { onlineManager } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  IRREVERSIBLE_ACTION_MESSAGE,
} from "@/components/dialog/confirm-dialog";
import { SearchInput } from "@/components/search-input";
import { PaymentDialog } from "@/features/orders/components/payment-dialog";
import { useCancelOrderMutation } from "@/features/orders/hooks/use-cancel-order-mutation";
import { useOpenTabs } from "@/features/orders/hooks/use-open-tabs";
import { usePayOrderMutation } from "@/features/orders/hooks/use-pay-order-mutation";
import { useRemoveOrderItemMutation } from "@/features/orders/hooks/use-remove-order-item-mutation";
import type { OrderAdjustmentsInput } from "@/features/orders/order-adjustments";
import { buildOrderDetailsTicket } from "@/features/orders/order-details-ticket";
import {
  getChangeMessage,
  isCustomerAccountOnly,
} from "@/features/orders/order-payments";
import {
  type OrderTicketBusiness,
  printOrderTicket,
} from "@/features/orders/print-order-ticket";
import type { OrderPaymentInput } from "@/features/orders/schemas";
import type {
  OrderDetails,
  OrderId,
  OrderItem,
  OrderTabTarget,
} from "@/features/orders/types";
import type {
  OrganizationCheckoutSettings,
  OrganizationId,
} from "@/features/organizations/types";
import {
  createOrderRequestId,
  type OrderRequestId,
  useOfflineOrderQueue,
} from "@/features/pos/offline-order-queue";
import { isNetworkError } from "@/lib/network-error";
import { OpenOrderTabDialog } from "./open-order-tab-dialog";
import { OpenOrderTabsGrid } from "./open-order-tabs-grid";

const QUEUED_PAYMENT_MESSAGE =
  "Sem internet: o pagamento será enviado quando a conexão voltar.";

type OpenTabState =
  | { step: "closed" }
  | { step: "details"; orderId: OrderId }
  | { step: "payment"; orderId: OrderId }
  | { step: "cancel"; orderId: OrderId };

type OpenOrderTabsPanelProps = {
  organizationId: OrganizationId;
  ticketBusiness: OrderTicketBusiness;
  checkoutSettings: OrganizationCheckoutSettings;
  posHref?: string;
  onAddProducts: (tabTarget: OrderTabTarget) => void;
};

function toRequestId(order: OrderDetails) {
  return order.id as string as OrderRequestId;
}

export function OpenOrderTabsPanel({
  organizationId,
  ticketBusiness,
  checkoutSettings,
  posHref,
  onAddProducts,
}: OpenOrderTabsPanelProps) {
  const { openTabs, isLoading, errorMessage } = useOpenTabs(organizationId);
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");
  const visibleTabs = normalizedSearch
    ? openTabs?.filter((order) =>
        (order.customerName ?? "")
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedSearch),
      )
    : openTabs;
  const removeOrderItemMutation = useRemoveOrderItemMutation(organizationId);
  const payOrderMutation = usePayOrderMutation(organizationId);
  const cancelOrderMutation = useCancelOrderMutation(organizationId);
  const enqueueOrder = useOfflineOrderQueue((state) => state.enqueueOrder);
  const removeQueuedOrder = useOfflineOrderQueue((state) => state.removeOrder);
  const chargeQueuedTab = useOfflineOrderQueue(
    (state) => state.chargeQueuedTab,
  );
  const [openTabState, setOpenTabState] = useState<OpenTabState>({
    step: "closed",
  });

  const selectedOrder =
    openTabState.step === "closed"
      ? null
      : (openTabs?.find((order) => order.id === openTabState.orderId) ?? null);
  const removingItemId = removeOrderItemMutation.isPending
    ? (removeOrderItemMutation.variables ?? null)
    : null;

  const selectOpenTab = useCallback((orderId: OrderId) => {
    setOpenTabState({ step: "details", orderId });
  }, []);

  function closeOpenTab() {
    setOpenTabState({ step: "closed" });
  }

  function backToDetails() {
    setOpenTabState((currentState) =>
      currentState.step === "closed"
        ? currentState
        : { step: "details", orderId: currentState.orderId },
    );
  }

  function removeItem(item: OrderItem) {
    removeOrderItemMutation.mutate(item.id, {
      onError: (error) => toast.error(error.message),
    });
  }

  function addProducts() {
    if (!selectedOrder) return;
    closeOpenTab();
    onAddProducts({
      orderId: selectedOrder.id,
      customerName: selectedOrder.customerName ?? "",
    });
  }

  function printOrder(order: OrderDetails) {
    printOrderTicket(buildOrderDetailsTicket(order, ticketBusiness));
  }

  function confirmPayment(
    payments: OrderPaymentInput[],
    adjustments: OrderAdjustmentsInput,
    total: number,
  ) {
    if (!selectedOrder) return;
    const paidOrder = selectedOrder;

    function finishPayment(isQueued: boolean) {
      closeOpenTab();
      toast.success(
        isCustomerAccountOnly(payments)
          ? `Comanda de ${paidOrder.customerName} lançada na conta.`
          : `Comanda de ${paidOrder.customerName} paga.`,
        {
          description: [
            getChangeMessage(payments, total),
            isQueued ? QUEUED_PAYMENT_MESSAGE : undefined,
          ]
            .filter(Boolean)
            .join(" "),
        },
      );
    }

    function queuePayment() {
      enqueueOrder({
        kind: "pay-order",
        requestId: createOrderRequestId(),
        organizationId,
        placedAt: new Date().toISOString(),
        customerName: paidOrder.customerName,
        total,
        orderId: paidOrder.id,
        payments,
        adjustments,
      });
      finishPayment(true);
    }

    if (paidOrder.isPendingSync) {
      chargeQueuedTab(toRequestId(paidOrder), payments, adjustments, total);
      finishPayment(true);
      return;
    }

    if (!onlineManager.isOnline()) {
      queuePayment();
      return;
    }

    payOrderMutation.mutate(
      { orderId: paidOrder.id, payments, adjustments },
      {
        onSuccess: () => finishPayment(false),
        onError: (error) => {
          if (isNetworkError(error)) {
            queuePayment();
            return;
          }
          toast.error(error.message);
        },
      },
    );
  }

  function confirmCancel() {
    if (!selectedOrder) return;
    const canceledOrder = selectedOrder;

    if (canceledOrder.isPendingSync) {
      removeQueuedOrder(toRequestId(canceledOrder));
      closeOpenTab();
      toast.success(`Comanda de ${canceledOrder.customerName} cancelada.`);
      return;
    }

    cancelOrderMutation.mutate(canceledOrder.id, {
      onSuccess: () => {
        closeOpenTab();
        toast.success(`Comanda de ${canceledOrder.customerName} cancelada.`);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {(openTabs?.length ?? 0) > 0 && (
          <SearchInput
            label="Buscar comanda pelo nome"
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="sm:max-w-xs"
          />
        )}
        <OpenOrderTabsGrid
          orders={visibleTabs}
          isLoading={isLoading}
          errorMessage={errorMessage}
          posHref={posHref}
          emptyMessage={
            normalizedSearch ? "Nenhuma comanda com esse nome." : undefined
          }
          onSelect={selectOpenTab}
        />
      </div>
      <OpenOrderTabDialog
        order={selectedOrder}
        isOpen={openTabState.step === "details" && selectedOrder !== null}
        removingItemId={removingItemId}
        onClose={closeOpenTab}
        onRemoveItem={removeItem}
        onAddProducts={addProducts}
        onCharge={() =>
          selectedOrder &&
          setOpenTabState({ step: "payment", orderId: selectedOrder.id })
        }
        onPrint={() => selectedOrder && printOrder(selectedOrder)}
        onCancelOrder={() =>
          selectedOrder &&
          setOpenTabState({ step: "cancel", orderId: selectedOrder.id })
        }
      />
      <PaymentDialog
        organizationId={organizationId}
        isOpen={openTabState.step === "payment" && selectedOrder !== null}
        title="Pagamento"
        submitLabel="Pagamento recebido"
        summary={{
          customerName: selectedOrder?.customerName ?? undefined,
          lines:
            selectedOrder?.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              rewardPrice: item.basePrice,
              addonNames: item.addonNames,
              total: item.total,
            })) ?? [],
          takeawayFee: selectedOrder?.takeawayFee ?? 0,
          isTakeaway: selectedOrder?.isTakeaway ?? false,
          total: selectedOrder?.total ?? 0,
        }}
        checkoutSettings={checkoutSettings}
        isServiceFeeSuggested
        isSubmitting={payOrderMutation.isPending}
        onClose={backToDetails}
        onConfirm={confirmPayment}
      />
      <ConfirmDialog
        isOpen={openTabState.step === "cancel" && selectedOrder !== null}
        onOpenChange={(isOpen) => !isOpen && backToDetails()}
        title="Cancelar comanda?"
        description={`Os produtos da comanda de ${selectedOrder?.customerName ?? ""} voltam para o estoque. ${IRREVERSIBLE_ACTION_MESSAGE}`}
        confirmLabel="Cancelar comanda"
        isConfirming={cancelOrderMutation.isPending}
        onConfirm={confirmCancel}
      />
    </>
  );
}
