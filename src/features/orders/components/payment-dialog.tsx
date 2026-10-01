"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Split, UserPlus } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  FormDialog,
  type FormDialogSecondaryAction,
} from "@/components/dialog/form-dialog";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomerAccountsQuery } from "@/features/customer-accounts/hooks/use-customer-accounts-query";
import {
  createPaymentFormSchema,
  type OrderPaymentInput,
  type PaymentFormInput,
} from "@/features/orders/schemas";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getPaymentsChange } from "../order-payments";
import {
  countUnassignedUnits,
  expandBillUnits,
  isSplitMode,
  removePersonFromAssignments,
  SPLIT_MODE_LABELS,
  SPLIT_MODES,
  type SplitMode,
  splitAmountEqually,
  sumAmountsByPerson,
  type UnitAssignments,
} from "../split-bill";
import { BillItemsAssignment } from "./bill-items-assignment";
import { OrderSummary, type OrderSummaryData } from "./order-summary";
import { PaymentLineFields } from "./payment-line-fields";

type PaymentDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  title: string;
  submitLabel: string;
  summary: OrderSummaryData;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (payments: OrderPaymentInput[]) => void;
  secondaryAction?: FormDialogSecondaryAction;
};

const MAX_PEOPLE = 10;
const UNASSIGNED_ITEMS_MESSAGE = "Escolha quem paga cada item.";

const EMPTY_PAYMENT_LINE = {} as PaymentFormInput["payments"][number];

function toCents(value: number) {
  return Math.round(value * 100);
}

function getBalanceMessage(remainingCents: number) {
  if (remainingCents === 0) return "Os pagamentos fecham o total.";
  const amount = formatCurrency(Math.abs(remainingCents) / 100);
  return remainingCents > 0 ? `Falta ${amount}` : `Passou ${amount} do total`;
}

function formatUnassignedCount(count: number) {
  return count === 1 ? "1 item sem pessoa" : `${count} itens sem pessoa`;
}

export function PaymentDialog({
  organizationId,
  isOpen,
  summary,
  isSubmitting,
  onClose,
  onConfirm,
  title,
  submitLabel,
  secondaryAction,
}: PaymentDialogProps) {
  const orderTotal = summary.total;
  const paymentFormSchema = useMemo(
    () => createPaymentFormSchema(orderTotal),
    [orderTotal],
  );
  const form = useForm<PaymentFormInput>({
    resolver: zodResolver(paymentFormSchema),
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "payments",
  });
  const payments = useWatch({ control: form.control, name: "payments" });
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [assignments, setAssignments] = useState<UnitAssignments>({});
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const customerAccountsQuery = useCustomerAccountsQuery(organizationId);
  const activeAccounts = useMemo(
    () =>
      (customerAccountsQuery.data ?? []).filter((account) => account.isActive),
    [customerAccountsQuery.data],
  );
  const billUnits = useMemo(
    () => expandBillUnits(summary.lines),
    [summary.lines],
  );

  const peopleCount = fields.length;
  const isSplit = peopleCount > 1;
  const computedAmounts = useMemo(() => {
    if (!isSplit || splitMode === "custom") return null;
    return splitMode === "equal"
      ? splitAmountEqually(orderTotal, peopleCount)
      : sumAmountsByPerson(
          billUnits,
          assignments,
          peopleCount,
          summary.takeawayFee,
        );
  }, [
    isSplit,
    splitMode,
    orderTotal,
    peopleCount,
    billUnits,
    assignments,
    summary.takeawayFee,
  ]);
  const computedAmountsKey = computedAmounts?.join("|") ?? "";
  const unassignedCount =
    isSplit && splitMode === "items"
      ? countUnassignedUnits(billUnits, assignments, peopleCount)
      : 0;
  const paidCents = (payments ?? []).reduce(
    (total, payment) => total + toCents(payment?.amount ?? 0),
    0,
  );
  const remainingCents = toCents(orderTotal) - paidCents;
  const change = getPaymentsChange(payments ?? [], orderTotal);
  const paymentsError =
    form.formState.errors.payments?.root?.message ?? assignmentError;

  useEffect(() => {
    if (!isOpen) return;
    form.reset({ payments: [EMPTY_PAYMENT_LINE] });
    setSplitMode("equal");
    setAssignments({});
    setAssignmentError(null);
  }, [isOpen, form]);

  useEffect(() => {
    if (!computedAmountsKey) return;
    computedAmountsKey.split("|").forEach((amount, index) => {
      form.setValue(`payments.${index}.amount`, Number(amount));
    });
  }, [computedAmountsKey, form]);

  const submitPayments = form.handleSubmit(({ payments: submittedPayments }) =>
    onConfirm(submittedPayments),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (unassignedCount > 0) {
      event.preventDefault();
      setAssignmentError(UNASSIGNED_ITEMS_MESSAGE);
      return;
    }
    void submitPayments(event);
  }

  function startSplit() {
    append(EMPTY_PAYMENT_LINE, { shouldFocus: false });
  }

  function addPerson() {
    append(EMPTY_PAYMENT_LINE, { shouldFocus: false });
  }

  function removePerson(personIndex: number) {
    remove(personIndex);
    setAssignments((currentAssignments) =>
      removePersonFromAssignments(currentAssignments, personIndex),
    );
  }

  function changeSplitMode(nextMode: SplitMode) {
    setSplitMode(nextMode);
    if (nextMode === "custom") {
      for (const index of fields.keys()) {
        form.setValue(`payments.${index}.amount`, undefined);
      }
    }
    setAssignmentError(null);
    form.clearErrors("payments");
  }

  function assignUnit(unitKey: string, personIndex: number) {
    setAssignments((currentAssignments) => ({
      ...currentAssignments,
      [unitKey]: personIndex,
    }));
    setAssignmentError(null);
    form.clearErrors("payments");
  }

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={title}
      submitLabel={submitLabel}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      secondaryAction={secondaryAction}
    >
      <FieldGroup>
        <OrderSummary summary={summary} />
        {isSplit && (
          <Tabs
            value={splitMode}
            onValueChange={(value: string) => {
              if (isSplitMode(value)) changeSplitMode(value);
            }}
          >
            <TabsList className="w-full group-data-horizontal/tabs:h-10">
              {SPLIT_MODES.map((mode) => (
                <TabsTrigger key={mode} value={mode}>
                  {SPLIT_MODE_LABELS[mode]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        {isSplit && splitMode === "items" && (
          <BillItemsAssignment
            units={billUnits}
            assignments={assignments}
            peopleCount={peopleCount}
            onAssign={assignUnit}
          />
        )}
        {fields.map((field, index) => (
          <PaymentLineFields
            key={field.id}
            control={form.control}
            index={index}
            isSplit={isSplit}
            orderTotal={orderTotal}
            remainingAmount={Math.max(remainingCents, 0) / 100}
            accounts={activeAccounts}
            computedAmount={computedAmounts?.[index]}
            onRemove={isSplit ? () => removePerson(index) : undefined}
          />
        ))}
        {!isSplit && (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={startSplit}
          >
            <Split aria-hidden />
            Dividir conta
          </Button>
        )}
        {isSplit && peopleCount < MAX_PEOPLE && (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={addPerson}
          >
            <UserPlus aria-hidden />
            Adicionar pessoa
          </Button>
        )}
        {isSplit && splitMode === "custom" && (
          <div
            aria-live="polite"
            className={cn(
              "rounded-lg px-4 py-3 font-medium text-sm",
              remainingCents === 0
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {getBalanceMessage(remainingCents)}
          </div>
        )}
        {unassignedCount > 0 && (
          <p
            aria-live="polite"
            className="rounded-lg bg-muted px-4 py-3 font-medium text-muted-foreground text-sm"
          >
            {formatUnassignedCount(unassignedCount)}
          </p>
        )}
        {paymentsError && <FieldError>{paymentsError}</FieldError>}
        {change > 0 && (
          <div className="flex items-baseline justify-between rounded-lg bg-muted px-4 py-3">
            <span className="text-muted-foreground text-sm">Troco</span>
            <span aria-live="polite" className="font-bold text-lg tabular-nums">
              {formatCurrency(change)}
            </span>
          </div>
        )}
      </FieldGroup>
    </FormDialog>
  );
}
