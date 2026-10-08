"use client";

import { format } from "date-fns";
import { PackageMinus } from "lucide-react";
import { useState } from "react";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatItemQuantity } from "@/features/ingredients/shopping-list";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useStockLossesQuery } from "@/features/stock-losses/hooks/use-stock-losses-query";
import {
  STOCK_LOSS_REASON_LABELS,
  STOCK_LOSS_REASONS,
} from "@/features/stock-losses/labels";
import { formatCurrency, formatDateKey } from "@/lib/format";
import { MonthNavigator } from "../../components/month-navigator";
import { StockLossFormDialog } from "./stock-loss-form-dialog";

const LOADING_ROW_COUNT = 3;

type StockLossesDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  ingredients: readonly Ingredient[];
  onClose: () => void;
};

export function StockLossesDialog({
  organizationId,
  isOpen,
  ingredients,
  onClose,
}: StockLossesDialogProps) {
  const [monthKey, setMonthKey] = useState(() => format(new Date(), "yyyy-MM"));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const lossesQuery = useStockLossesQuery(organizationId, monthKey);

  if (isOpen && isFormOpen) {
    return (
      <StockLossFormDialog
        organizationId={organizationId}
        ingredients={ingredients}
        onClose={() => setIsFormOpen(false)}
      />
    );
  }

  const month = lossesQuery.data;
  const reasonsWithLosses = STOCK_LOSS_REASONS.filter(
    (reason) => (month?.valueByReason[reason] ?? 0) > 0,
  );

  return (
    <DetailsDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Perdas"
      size="large"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            onClick={onClose}
          >
            Fechar
          </Button>
          <Button
            type="button"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            disabled={ingredients.length === 0}
            onClick={() => setIsFormOpen(true)}
          >
            <PackageMinus aria-hidden />
            Registrar perda
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex justify-center">
          <MonthNavigator monthKey={monthKey} onChange={setMonthKey} />
        </div>

        {lossesQuery.error ? (
          <Alert variant="destructive">
            <AlertDescription>{lossesQuery.error.message}</AlertDescription>
          </Alert>
        ) : !month ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: LOADING_ROW_COUNT }, (_, rowIndex) => (
              <Skeleton
                key={`loading-${rowIndex.toString()}`}
                className="h-14 rounded-xl"
              />
            ))}
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground text-sm">
                  Perdido no mês
                </span>
                <span className="font-semibold text-destructive text-xl tabular-nums">
                  {formatCurrency(month.totalValue)}
                </span>
              </div>
              {reasonsWithLosses.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {reasonsWithLosses.map((reason) => (
                    <li key={reason}>
                      <Badge variant="secondary" className="tabular-nums">
                        {STOCK_LOSS_REASON_LABELS[reason]} ·{" "}
                        {formatCurrency(month.valueByReason[reason])}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {month.losses.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
                Nenhuma perda registrada neste mês.
              </p>
            ) : (
              <ul className="flex flex-col divide-y rounded-xl border">
                {month.losses.map((loss) => (
                  <li
                    key={loss.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium text-sm">
                        {formatItemQuantity(loss.quantity, loss.unit)} de{" "}
                        {loss.ingredientName}
                      </span>
                      <span className="truncate text-muted-foreground text-xs">
                        {formatDateKey(loss.lossDate)} ·{" "}
                        {STOCK_LOSS_REASON_LABELS[loss.reason]}
                        {loss.note && ` · ${loss.note}`}
                        {loss.createdByName && ` · ${loss.createdByName}`}
                      </span>
                    </div>
                    <span className="shrink-0 font-medium text-sm tabular-nums">
                      {formatCurrency(loss.value)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </DetailsDialog>
  );
}
