"use client";

import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  IRREVERSIBLE_ACTION_MESSAGE,
} from "@/components/dialog/confirm-dialog";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import {
  type QueuedOrder,
  useOfflineOrderQueue,
} from "@/features/pos/offline-order-queue";
import { formatCurrency } from "@/lib/format";

type QueuedOrdersDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  queuedOrders: QueuedOrder[];
  isOnline: boolean;
};

function getQueuedOrderTitle(queuedOrder: QueuedOrder) {
  if (queuedOrder.kind === "add-items") {
    return `Itens na comanda de ${queuedOrder.customerName}`;
  }
  return queuedOrder.customerName ?? "Venda no balcão";
}

export function QueuedOrdersDialog({
  isOpen,
  onOpenChange,
  queuedOrders,
  isOnline,
}: QueuedOrdersDialogProps) {
  const retryOrder = useOfflineOrderQueue((state) => state.retryOrder);
  const removeOrder = useOfflineOrderQueue((state) => state.removeOrder);
  const [orderToDiscard, setOrderToDiscard] = useState<QueuedOrder | null>(
    null,
  );

  function confirmDiscard() {
    if (!orderToDiscard) return;
    removeOrder(orderToDiscard.requestId);
    setOrderToDiscard(null);
    toast.success("Venda descartada.");
  }

  return (
    <>
      <DetailsDialog
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        title="Vendas para enviar"
        footer={
          <DialogClose
            render={
              <Button
                variant="outline"
                className={DIALOG_ACTION_BUTTON_CLASS_NAME}
              />
            }
          >
            Fechar
          </DialogClose>
        }
      >
        <div className="flex flex-col gap-4 text-sm">
          <p className="text-muted-foreground">
            {isOnline
              ? "As vendas feitas sem internet estão sendo enviadas."
              : "Sem internet. As vendas serão enviadas sozinhas quando a conexão voltar."}
          </p>
          {queuedOrders.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma venda pendente.</p>
          ) : (
            <ul className="flex flex-col divide-y rounded-lg border">
              {queuedOrders.map((queuedOrder) => (
                <li
                  key={queuedOrder.requestId}
                  className="flex flex-col gap-2 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-medium">
                        {getQueuedOrderTitle(queuedOrder)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(queuedOrder.placedAt), "dd/MM HH:mm")}
                        {queuedOrder.syncState.status === "pending" &&
                          " · aguardando envio"}
                      </span>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatCurrency(queuedOrder.total)}
                    </span>
                  </div>
                  {queuedOrder.syncState.status === "failed" && (
                    <div className="flex flex-col gap-2 rounded-md bg-destructive/10 p-2.5">
                      <p className="text-destructive text-xs">
                        {queuedOrder.syncState.errorMessage}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 flex-1"
                          onClick={() => retryOrder(queuedOrder.requestId)}
                        >
                          Tentar de novo
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          className="h-9 flex-1"
                          onClick={() => setOrderToDiscard(queuedOrder)}
                        >
                          Descartar
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DetailsDialog>
      <ConfirmDialog
        isOpen={orderToDiscard !== null}
        onOpenChange={(isConfirmOpen) =>
          !isConfirmOpen && setOrderToDiscard(null)
        }
        title="Descartar venda?"
        description={`A venda não será registrada no sistema. ${IRREVERSIBLE_ACTION_MESSAGE}`}
        confirmLabel="Descartar"
        isConfirming={false}
        onConfirm={confirmDiscard}
      />
    </>
  );
}
