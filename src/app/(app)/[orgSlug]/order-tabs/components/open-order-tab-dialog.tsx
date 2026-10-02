import { format } from "date-fns";
import { Ban, ClipboardPlus, CreditCard, Printer } from "lucide-react";
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
}: OpenOrderTabDialogProps) {
  const isBusy = removingItemId !== null;
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
              {
                label: "Aberta em",
                value: format(new Date(order.createdAt), "dd/MM/yyyy, HH:mm"),
              },
              { label: "Atendente", value: order.attendantName ?? "—" },
              ...(order.note ? [{ label: "Obs", value: order.note }] : []),
            ]}
          />
          <OrderItemsList
            order={order}
            removingItemId={removingItemId}
            onRemoveItem={onRemoveItem}
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
      )}
    </DetailsDialog>
  );
}
