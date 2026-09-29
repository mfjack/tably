"use client";

import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { MEASURE_UNITS } from "@/features/ingredients/measure-units";
import type { OrganizationId } from "@/features/organizations/types";
import { useSupplierPurchasesQuery } from "@/features/suppliers/hooks/use-supplier-purchases-query";
import type { Supplier } from "@/features/suppliers/types";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";

const LOADING_ROW_COUNT = 3;

type SupplierPurchasesDialogProps = {
  organizationId: OrganizationId;
  supplier: Supplier | null;
  onClose: () => void;
};

export function SupplierPurchasesDialog({
  organizationId,
  supplier,
  onClose,
}: SupplierPurchasesDialogProps) {
  const purchasesQuery = useSupplierPurchasesQuery(
    organizationId,
    supplier?.id ?? null,
  );

  return (
    <DetailsDialog
      isOpen={supplier !== null}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={supplier ? supplier.name : "Fornecedor"}
      footer={
        <Button
          type="button"
          variant="outline"
          className={cn(DIALOG_ACTION_BUTTON_CLASS_NAME, "col-span-2")}
          onClick={onClose}
        >
          Fechar
        </Button>
      }
    >
      {supplier && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 rounded-lg bg-muted px-4 py-3 text-sm">
            {supplier.contactName && (
              <span className="font-medium">{supplier.contactName}</span>
            )}
            {supplier.suppliedItems && (
              <span className="text-muted-foreground">
                Fornece: {supplier.suppliedItems}
              </span>
            )}
            {supplier.phone && <WhatsAppLink phone={supplier.phone} />}
            {supplier.purchaseUrl && (
              <a
                href={supplier.purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
              >
                <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                Abrir link de compra
              </a>
            )}
            {supplier.notes && (
              <p className="whitespace-pre-wrap text-muted-foreground">
                {supplier.notes}
              </p>
            )}
          </div>

          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold text-sm">Compras de insumos</h3>
            <span className="text-muted-foreground text-sm tabular-nums">
              {formatCurrency(supplier.totalSpent)}
            </span>
          </div>

          {purchasesQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {purchasesQuery.error.message}
              </AlertDescription>
            </Alert>
          ) : purchasesQuery.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: LOADING_ROW_COUNT }, (_, rowIndex) => (
                <Skeleton
                  key={`purchase-${rowIndex.toString()}`}
                  className="h-12"
                />
              ))}
            </div>
          ) : purchasesQuery.data?.length ? (
            <ul className="divide-y">
              {purchasesQuery.data.map((purchase) => (
                <li
                  key={purchase.id}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">
                      {purchase.ingredientName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(purchase.enteredAt), "dd/MM/yyyy")} ·{" "}
                      {formatQuantity(purchase.quantity)}{" "}
                      {MEASURE_UNITS[purchase.unit].symbol}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-sm tabular-nums">
                    {formatCurrency(purchase.totalCost)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-muted-foreground text-sm">
              Nenhuma compra registrada. Ao dar entrada de insumos, escolha este
              fornecedor.
            </p>
          )}
        </div>
      )}
    </DetailsDialog>
  );
}
