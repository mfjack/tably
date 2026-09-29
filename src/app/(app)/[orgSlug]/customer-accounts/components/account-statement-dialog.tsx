"use client";

import { format } from "date-fns";
import { HandCoins } from "lucide-react";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountEntriesQuery } from "@/features/customer-accounts/hooks/use-account-entries-query";
import type {
  AccountEntry,
  CustomerAccount,
} from "@/features/customer-accounts/types";
import { getPaymentMethodLabel } from "@/features/orders/payment-methods";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import { formatPhone } from "@/lib/masks";
import { cn } from "@/lib/utils";

const LOADING_ROW_COUNT = 3;

type AccountStatementDialogProps = {
  organizationId: OrganizationId;
  account: CustomerAccount | null;
  onClose: () => void;
  onReceivePayment: (account: CustomerAccount) => void;
};

function describeEntry(entry: AccountEntry) {
  if (entry.kind === "charge") return "Compra";
  return entry.paymentMethod
    ? `Pagamento · ${getPaymentMethodLabel(entry.paymentMethod)}`
    : "Pagamento";
}

function AccountEntryRow({ entry }: { entry: AccountEntry }) {
  const isCharge = entry.kind === "charge";
  const details = [
    format(new Date(entry.createdAt), "dd/MM/yyyy, HH:mm"),
    entry.operatorName,
    entry.note,
  ].filter(Boolean);

  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="font-medium text-sm">{describeEntry(entry)}</p>
        <p className="truncate text-muted-foreground text-xs">
          {details.join(" · ")}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 font-semibold text-sm tabular-nums",
          isCharge ? "text-destructive" : "text-primary",
        )}
      >
        {isCharge ? "+" : "−"} {formatCurrency(entry.amount)}
      </span>
    </li>
  );
}

export function AccountStatementDialog({
  organizationId,
  account,
  onClose,
  onReceivePayment,
}: AccountStatementDialogProps) {
  const entriesQuery = useAccountEntriesQuery(
    organizationId,
    account?.id ?? null,
  );
  const hasDebt = (account?.balance ?? 0) > 0;

  return (
    <DetailsDialog
      isOpen={account !== null}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={account ? `Extrato de ${account.name}` : "Extrato"}
      footer={
        <Button
          type="button"
          className={cn(DIALOG_ACTION_BUTTON_CLASS_NAME, "col-span-2")}
          disabled={!hasDebt}
          onClick={() => account && onReceivePayment(account)}
        >
          <HandCoins aria-hidden />
          {hasDebt ? "Receber pagamento" : "Conta sem débito"}
        </Button>
      }
    >
      {account && (
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4 rounded-lg bg-muted px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">
                Saldo devedor
              </span>
              <span
                className={cn(
                  "font-bold text-2xl tabular-nums",
                  hasDebt && "text-destructive",
                )}
              >
                {formatCurrency(account.balance)}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-muted-foreground text-xs">
              {account.phone && <span>{formatPhone(account.phone)}</span>}
              <span>
                {account.creditLimit === null
                  ? "Sem limite"
                  : `Limite ${formatCurrency(account.creditLimit)}`}
              </span>
            </div>
          </div>

          {entriesQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>{entriesQuery.error.message}</AlertDescription>
            </Alert>
          ) : entriesQuery.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: LOADING_ROW_COUNT }, (_, rowIndex) => (
                <Skeleton
                  key={`entry-${rowIndex.toString()}`}
                  className="h-12"
                />
              ))}
            </div>
          ) : entriesQuery.data?.length ? (
            <ul className="divide-y">
              {entriesQuery.data.map((entry) => (
                <AccountEntryRow key={entry.id} entry={entry} />
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
