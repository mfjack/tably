"use client";

import { MonitorSmartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  IRREVERSIBLE_ACTION_MESSAGE,
} from "@/components/dialog/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentDialog } from "@/features/orders/components/payment-dialog";
import { useCancelOrderMutation } from "@/features/orders/hooks/use-cancel-order-mutation";
import { useOpenOrderTabsQuery } from "@/features/orders/hooks/use-open-order-tabs-query";
import { usePaidOrdersQuery } from "@/features/orders/hooks/use-paid-orders-query";
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
import type { OrderDetails, OrderId, OrderItem } from "@/features/orders/types";
import type {
  OrganizationCheckoutSettings,
  OrganizationId,
} from "@/features/organizations/types";
import { useCartStore } from "@/features/pos/cart-store";
import { ModuleLinkButton } from "../../components/module-link-button";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { OpenOrderTabDialog } from "./open-order-tab-dialog";
import { OpenOrderTabsGrid } from "./open-order-tabs-grid";
import { PaidOrderDialog } from "./paid-order-dialog";
import { PaidOrdersTable } from "./paid-orders-table";

type OpenTabState =
  | { step: "closed" }
  | { step: "details"; orderId: OrderId }
  | { step: "payment"; orderId: OrderId }
  | { step: "cancel"; orderId: OrderId };

type OrderTabsViewProps = {
  organizationId: OrganizationId;
  ticketBusiness: OrderTicketBusiness;
  checkoutSettings: OrganizationCheckoutSettings;
  title: string;
  description: string;
  posHref: string;
  canOpenPos: boolean;
};

export function OrderTabsView({
  organizationId,
  ticketBusiness,
  checkoutSettings,
  title,
  description,
  posHref,
  canOpenPos,
}: OrderTabsViewProps) {
  const router = useRouter();
  const setTabTarget = useCartStore((state) => state.setTabTarget);
  const openOrderTabsQuery = useOpenOrderTabsQuery(organizationId);
  const paidOrdersQuery = usePaidOrdersQuery(organizationId);
  const removeOrderItemMutation = useRemoveOrderItemMutation(organizationId);
  const payOrderMutation = usePayOrderMutation(organizationId);
  const cancelOrderMutation = useCancelOrderMutation(organizationId);

  const [openTabState, setOpenTabState] = useState<OpenTabState>({
    step: "closed",
  });
  const [selectedPaidOrder, setSelectedPaidOrder] =
    useState<OrderDetails | null>(null);

  const selectedOrder =
    openTabState.step === "closed"
      ? null
      : (openOrderTabsQuery.data?.find(
          (order) => order.id === openTabState.orderId,
        ) ?? null);
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
    setTabTarget(organizationId, {
      orderId: selectedOrder.id,
      customerName: selectedOrder.customerName ?? "",
    });
    router.push(posHref);
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

    payOrderMutation.mutate(
      { orderId: paidOrder.id, payments, adjustments },
      {
        onSuccess: () => {
          closeOpenTab();
          toast.success(
            isCustomerAccountOnly(payments)
              ? `Comanda de ${paidOrder.customerName} lançada na conta.`
              : `Comanda de ${paidOrder.customerName} paga.`,
            {
              description: getChangeMessage(payments, total),
            },
          );
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function confirmCancel() {
    if (!selectedOrder) return;
    const canceledOrder = selectedOrder;

    cancelOrderMutation.mutate(canceledOrder.id, {
      onSuccess: () => {
        closeOpenTab();
        toast.success(`Comanda de ${canceledOrder.customerName} cancelada.`);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  const openTabCount = openOrderTabsQuery.data?.length ?? 0;

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          canOpenPos && (
            <ModuleLinkButton
              href={posHref}
              label="PDV"
              icon={MonitorSmartphone}
            />
          )
        }
      />
      <PageContent>
        <Tabs defaultValue="open" className="min-h-0 flex-1 gap-6">
          <TabsList className="group-data-horizontal/tabs:h-10">
            <TabsTrigger value="open" className="px-4">
              Abertas
              {openTabCount > 0 && (
                <span className="text-muted-foreground tabular-nums">
                  {openTabCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="px-4">
              Histórico
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="open"
            className="flex min-h-0 flex-col overflow-y-auto *:shrink-0"
          >
            <OpenOrderTabsGrid
              orders={openOrderTabsQuery.data}
              isLoading={openOrderTabsQuery.isPending}
              errorMessage={openOrderTabsQuery.error?.message}
              posHref={posHref}
              onSelect={selectOpenTab}
            />
          </TabsContent>
          <TabsContent value="history" className="flex min-h-0 flex-col">
            <PaidOrdersTable
              orders={paidOrdersQuery.data}
              isLoading={paidOrdersQuery.isPending}
              errorMessage={paidOrdersQuery.error?.message}
              onSelect={setSelectedPaidOrder}
            />
          </TabsContent>
        </Tabs>
      </PageContent>

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
      <PaidOrderDialog
        order={selectedPaidOrder}
        onClose={() => setSelectedPaidOrder(null)}
        onPrint={printOrder}
      />
    </>
  );
}
