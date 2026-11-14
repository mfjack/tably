"use client";

import { useState } from "react";
import { toast } from "sonner";
import { IRREVERSIBLE_ACTION_MESSAGE } from "@/components/dialog/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCancelPaidOrderMutation } from "@/features/orders/hooks/use-cancel-paid-order-mutation";
import { useOpenTabs } from "@/features/orders/hooks/use-open-tabs";
import { usePaidOrdersQuery } from "@/features/orders/hooks/use-paid-orders-query";
import { useReopenOrderMutation } from "@/features/orders/hooks/use-reopen-order-mutation";
import { buildOrderDetailsTicket } from "@/features/orders/order-details-ticket";
import {
  type OrderTicketBusiness,
  printOrderTicket,
} from "@/features/orders/print-order-ticket";
import type { OrderDetails, OrderTabTarget } from "@/features/orders/types";
import type {
  OrganizationCheckoutSettings,
  OrganizationId,
} from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import { AuthorizedConfirmDialog } from "./authorized-confirm-dialog";
import { OpenOrderTabsPanel } from "./open-order-tabs-panel";
import { PaidOrderDialog } from "./paid-order-dialog";
import { PaidOrdersTable } from "./paid-orders-table";

type PaidOrderState =
  | { step: "closed" }
  | { step: "details" | "reopen" | "cancel"; order: OrderDetails };

type OrderTabsSection = "open" | "history";

type OrderTabsBoardProps = {
  organizationId: OrganizationId;
  ticketBusiness: OrderTicketBusiness;
  checkoutSettings: OrganizationCheckoutSettings;
  posHref?: string;
  onAddProducts: (tabTarget: OrderTabTarget) => void;
};

export function OrderTabsBoard({
  organizationId,
  ticketBusiness,
  checkoutSettings,
  posHref,
  onAddProducts,
}: OrderTabsBoardProps) {
  const [salesDate, setSalesDate] = useState("");
  const paidOrdersQuery = usePaidOrdersQuery(organizationId, salesDate);
  const reopenOrderMutation = useReopenOrderMutation(organizationId);
  const cancelPaidOrderMutation = useCancelPaidOrderMutation(organizationId);

  const [paidOrderState, setPaidOrderState] = useState<PaidOrderState>({
    step: "closed",
  });
  const [section, setSection] = useState<OrderTabsSection>("open");

  const { isOrderTabsEnabled } = checkoutSettings;
  const { openTabs } = useOpenTabs(organizationId, isOrderTabsEnabled);

  function printOrder(order: OrderDetails) {
    printOrderTicket(buildOrderDetailsTicket(order, ticketBusiness));
  }

  function confirmReopen(pin: string | null) {
    if (paidOrderState.step !== "reopen") return;
    const reopenedOrder = paidOrderState.order;

    reopenOrderMutation.mutate(
      { orderId: reopenedOrder.id, pin },
      {
        onSuccess: () => {
          setPaidOrderState({ step: "closed" });
          setSection("open");
          toast.success(`Comanda de ${reopenedOrder.customerName} reaberta.`);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function confirmPaidOrderCancel(pin: string | null) {
    if (paidOrderState.step !== "cancel") return;
    const canceledOrder = paidOrderState.order;

    cancelPaidOrderMutation.mutate(
      { orderId: canceledOrder.id, pin },
      {
        onSuccess: () => {
          setPaidOrderState({ step: "closed" });
          toast.success("Venda cancelada.");
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function backToPaidOrderDetails(isDialogOpen: boolean) {
    if (isDialogOpen) return;
    setPaidOrderState((currentState) =>
      currentState.step === "closed"
        ? currentState
        : { step: "details", order: currentState.order },
    );
  }

  const openTabCount = openTabs?.length ?? 0;
  const paidOrdersTable = (
    <PaidOrdersTable
      orders={paidOrdersQuery.data}
      isLoading={paidOrdersQuery.isPending}
      errorMessage={paidOrdersQuery.error?.message}
      dateKey={salesDate}
      onDateChange={setSalesDate}
      onSelect={(order) => setPaidOrderState({ step: "details", order })}
    />
  );

  return (
    <>
      {isOrderTabsEnabled ? (
        <Tabs
          value={section}
          onValueChange={(value) =>
            setSection(value === "history" ? "history" : "open")
          }
          className="min-h-0 flex-1 gap-6"
        >
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
              Histórico de Vendas
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="open"
            className="flex min-h-0 flex-col overflow-y-auto *:shrink-0"
          >
            <OpenOrderTabsPanel
              organizationId={organizationId}
              ticketBusiness={ticketBusiness}
              checkoutSettings={checkoutSettings}
              posHref={posHref}
              onAddProducts={onAddProducts}
            />
          </TabsContent>
          <TabsContent value="history" className="flex min-h-0 flex-col">
            {paidOrdersTable}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">{paidOrdersTable}</div>
      )}

      <PaidOrderDialog
        order={paidOrderState.step === "details" ? paidOrderState.order : null}
        onClose={() => setPaidOrderState({ step: "closed" })}
        onPrint={printOrder}
        onReopen={
          isOrderTabsEnabled
            ? (order) => setPaidOrderState({ step: "reopen", order })
            : undefined
        }
        onCancel={(order) => setPaidOrderState({ step: "cancel", order })}
      />
      <AuthorizedConfirmDialog
        isPinRequired={checkoutSettings.isCancelPinRequired}
        isOpen={paidOrderState.step === "cancel"}
        onOpenChange={backToPaidOrderDetails}
        title="Cancelar venda?"
        description={`A venda de ${paidOrderState.step === "closed" ? "" : formatCurrency(paidOrderState.order.total)} é desfeita: os produtos voltam para o estoque e o pagamento sai do caixa, do financeiro, da conta do cliente e da fidelidade. Devolva o dinheiro ao cliente ou estorne na maquininha. ${IRREVERSIBLE_ACTION_MESSAGE}`}
        confirmLabel="Cancelar venda"
        isConfirming={cancelPaidOrderMutation.isPending}
        onConfirm={confirmPaidOrderCancel}
      />
      <AuthorizedConfirmDialog
        isPinRequired={checkoutSettings.isCancelPinRequired}
        isOpen={paidOrderState.step === "reopen"}
        onOpenChange={backToPaidOrderDetails}
        title="Reabrir comanda?"
        description={`A comanda de ${paidOrderState.step === "closed" ? "" : (paidOrderState.order.customerName ?? "")} volta para as abertas e o pagamento é desfeito: sai do caixa, do financeiro, da conta do cliente e da fidelidade. Depois é só cobrar de novo.`}
        confirmLabel="Reabrir comanda"
        isConfirming={reopenOrderMutation.isPending}
        onConfirm={confirmReopen}
      />
    </>
  );
}
