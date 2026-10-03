"use client";

import { format } from "date-fns";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { useLoyaltyTransactionsQuery } from "@/features/loyalty/hooks/use-loyalty-transactions-query";
import type {
  LoyaltyCustomer,
  LoyaltyProgram,
  LoyaltyTransaction,
  LoyaltyTransactionKind,
} from "@/features/loyalty/types";
import type { OrganizationId } from "@/features/organizations/types";
import { cn } from "@/lib/utils";

const LOADING_ROW_COUNT = 3;

const TRANSACTION_KIND_LABELS = {
  earn: "Compra",
  redeem: "Prêmio resgatado",
  adjust: "Ajuste manual",
} as const satisfies Record<LoyaltyTransactionKind, string>;

type LoyaltyHistoryDialogProps = {
  organizationId: OrganizationId;
  customer: LoyaltyCustomer | null;
  program: LoyaltyProgram;
  onClose: () => void;
};

function formatStamps(stamps: number) {
  const label = Math.abs(stamps) === 1 ? "selo" : "selos";
  return `${stamps > 0 ? "+" : "−"} ${Math.abs(stamps)} ${label}`;
}

function TransactionRow({ transaction }: { transaction: LoyaltyTransaction }) {
  const details = [
    format(new Date(transaction.createdAt), "dd/MM/yyyy, HH:mm"),
    transaction.createdByName,
    transaction.note,
  ].filter(Boolean);

  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="font-medium text-sm">
          {TRANSACTION_KIND_LABELS[transaction.kind]}
        </p>
        <p className="truncate text-muted-foreground text-xs">
          {details.join(" · ")}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 font-semibold text-sm tabular-nums",
          transaction.stamps > 0
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-muted-foreground",
        )}
      >
        {formatStamps(transaction.stamps)}
      </span>
    </li>
  );
}

export function LoyaltyHistoryDialog({
  organizationId,
  customer,
  program,
  onClose,
}: LoyaltyHistoryDialogProps) {
  const transactionsQuery = useLoyaltyTransactionsQuery(
    organizationId,
    customer?.id ?? null,
  );

  function closeDialog(isDialogOpen: boolean) {
    if (!isDialogOpen) onClose();
  }

  return (
    <DetailsDialog
      isOpen={customer !== null}
      onOpenChange={closeDialog}
      title={customer ? `Fidelidade de ${customer.name}` : "Fidelidade"}
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
      {customer && (
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4 rounded-lg bg-muted px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">Selos</span>
              <span className="font-bold text-2xl tabular-nums">
                {customer.balance} de {program.stampsRequired}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-muted-foreground text-xs">
              <WhatsAppLink phone={customer.phone} />
              <span>
                {customer.totalRedeemed}{" "}
                {customer.totalRedeemed === 1
                  ? "prêmio resgatado"
                  : "prêmios resgatados"}
              </span>
            </div>
          </div>

          {transactionsQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {transactionsQuery.error.message}
              </AlertDescription>
            </Alert>
          ) : transactionsQuery.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: LOADING_ROW_COUNT }, (_, rowIndex) => (
                <Skeleton
                  key={`transaction-${rowIndex.toString()}`}
                  className="h-12"
                />
              ))}
            </div>
          ) : transactionsQuery.data?.length ? (
            <ul className="divide-y">
              {transactionsQuery.data.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                />
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-muted-foreground text-sm">
              Nenhuma movimentação ainda.
            </p>
          )}
        </div>
      )}
    </DetailsDialog>
  );
}
