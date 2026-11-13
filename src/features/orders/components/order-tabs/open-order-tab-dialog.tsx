import { format } from "date-fns";
import {
  ArrowLeftRight,
  Ban,
  ClipboardPlus,
  CreditCard,
  Printer,
} from "lucide-react";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Button } from "@/components/ui/button";
import type {
  OrderDetails,
  OrderItem,
  OrderItemId,
} from "@/features/orders/types";
import { OrderInfoList } from "./order-info-list";
import { OrderItemsList } from "./order-items-list";

type OpenOrderTabDialogProps = {
  order: OrderDetails | null;
  isOpen: boolean;
  removingItemId: OrderItemId | null;
  onClose: () => void;
  onRemoveItem: (item: OrderItem) => void;
  onAddProducts: () => void;
  onCharge: () => void;
  onPrint: () => void;
  onCancelOrder: () => void;
  onChangeTable: () => void;
};

export function OpenOrderTabDialog({
  order,
  isOpen,
  removingItemId,
  onClose,
  onRemoveItem,
  onAddProducts,
  onCharge,
  onPrint,
  onCancelOrder,
  onChangeTable,
}: OpenOrderTabDialogProps) {
  const isBusy = removingItemId !== null;
  const isPendingSync = order?.isPendingSync ?? false;
  const hasItems = (order?.items.length ?? 0) > 0;

  return (
    <DetailsDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Detalhes da comanda"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            disabled={isBusy}
            onClick={onAddProducts}
          >
            <ClipboardPlus aria-hidden />
            Adicionar produtos
          </Button>
          <Button
            type="button"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            disabled={isBusy || !hasItems}
            onClick={onCharge}
          >
            <CreditCard aria-hidden />
            Cobrar
          </Button>
        </>
      }
    >
      {order && (
        <div className="flex flex-col gap-5">
          <OrderInfoList
            rows={[
              { label: "Cliente", value: order.customerName ?? "" },
              ...(order.tableNumber
                ? [{ label: "Mesa", value: String(order.tableNumber) }]
                : []),
              {
                label: "Aberta em",
                value: format(new Date(order.createdAt), "dd/MM/yyyy, HH:mm"),
              },
              { label: "Atendente", value: order.attendantName ?? "—" },
              ...(order.note ? [{ label: "Obs", value: order.note }] : []),
            ]}
          />
          {isPendingSync && (
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
              Aberta sem internet. Ela será enviada quando a conexão voltar; até
              lá, dá para adicionar produtos, cobrar, imprimir ou cancelar.
            </p>
          )}
          <OrderItemsList
            order={order}
            removingItemId={removingItemId}
            onRemoveItem={isPendingSync ? undefined : onRemoveItem}
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={isBusy}
              onClick={onCancelOrder}
            >
              <Ban aria-hidden />
              Cancelar comanda
            </Button>
            <div className="flex gap-1">
              {order.tableNumber !== null && !isPendingSync && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isBusy}
                  onClick={onChangeTable}
                >
                  <ArrowLeftRight aria-hidden />
                  Trocar mesa
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                disabled={isBusy || !hasItems}
                onClick={onPrint}
              >
                <Printer aria-hidden />
                Imprimir
              </Button>
            </div>
          </div>
        </div>
      )}
    </DetailsDialog>
  );
}
