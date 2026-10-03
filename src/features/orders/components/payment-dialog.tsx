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
import { useOpenCashSessionQuery } from "@/features/cash-register/hooks/use-open-cash-session-query";
import { useCustomerAccountsQuery } from "@/features/customer-accounts/hooks/use-customer-accounts-query";
import {
  EMPTY_LOYALTY_CHECKOUT,
  LoyaltyCheckoutFields,
  type LoyaltyCheckoutFormInput,
} from "@/features/loyalty/components/loyalty-checkout-fields";
import { useLoyaltyCustomerLookupQuery } from "@/features/loyalty/hooks/use-loyalty-customer-lookup-query";
import {
  LOYALTY_PHONE_PATTERN,
  type LoyaltyCheckoutInput,
} from "@/features/loyalty/schemas";
import {
  createPaymentFormSchema,
  type OrderPaymentInput,
  type PaymentFormInput,
} from "@/features/orders/schemas";
import type {
  OrganizationCheckoutSettings,
  OrganizationId,
} from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  calculateOrderTotals,
  type OrderAdjustmentsInput,
} from "../order-adjustments";
import { getPaymentsChange } from "../order-payments";
import {
  PAYMENT_METHOD_VALUES,
  RECEIVABLE_PAYMENT_METHOD_VALUES,
} from "../payment-methods";
import {
  countUnassignedUnits,
  distributeAdjustment,
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
import {
  type AdjustmentsFormInput,
  OrderAdjustmentsFields,
} from "./order-adjustments-fields";
import { OrderSummary, type OrderSummaryData } from "./order-summary";
import { PaymentLineFields } from "./payment-line-fields";

type PaymentDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  title: string;
  submitLabel: string;
  summary: OrderSummaryData;
  checkoutSettings: OrganizationCheckoutSettings;
  isServiceFeeSuggested: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (
    payments: OrderPaymentInput[],
    adjustments: OrderAdjustmentsInput,
    total: number,
  ) => void;
  secondaryAction?: FormDialogSecondaryAction;
};

const MAX_PEOPLE = 10;
const UNASSIGNED_ITEMS_MESSAGE = "Escolha quem paga cada item.";

const EMPTY_PAYMENT_LINE = {} as PaymentFormInput["payments"][number];

const INVALID_DISCOUNT_MESSAGE = "Confira o valor do desconto.";
const INCOMPLETE_LOYALTY_PHONE_MESSAGE =
  "Complete o celular da fidelidade ou apague o campo.";
const LOYALTY_LOOKUP_PENDING_MESSAGE = "Aguarde a busca do cliente.";
const MISSING_LOYALTY_NAME_MESSAGE = "Informe o nome do cliente novo.";

type LoyaltyCheckoutResult =
  | { status: "valid"; input: LoyaltyCheckoutInput | undefined }
  | { status: "invalid"; message: string };

function toOrderAdjustments(
  values: AdjustmentsFormInput,
): OrderAdjustmentsInput {
  return {
    hasServiceFee: values.hasServiceFee,
    discount:
      values.hasDiscount && values.discountValue !== undefined
        ? { type: values.discountType, value: values.discountValue }
        : undefined,
  };
}

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
  checkoutSettings,
  isServiceFeeSuggested,
  isSubmitting,
  onClose,
  onConfirm,
  title,
  submitLabel,
  secondaryAction,
}: PaymentDialogProps) {
  const serviceFeePercent = checkoutSettings.isServiceFeeEnabled
    ? checkoutSettings.serviceFeePercent
    : 0;
  const canChargeServiceFee = !summary.isTakeaway && serviceFeePercent > 0;
  const paymentMethods = checkoutSettings.isCustomerAccountPaymentEnabled
    ? PAYMENT_METHOD_VALUES
    : RECEIVABLE_PAYMENT_METHOD_VALUES;
  const adjustmentsForm = useForm<AdjustmentsFormInput>({
    defaultValues: {
      hasServiceFee: false,
      hasDiscount: false,
      discountType: "percent",
    },
  });
  const adjustmentValues = useWatch({ control: adjustmentsForm.control });
  const adjustments = toOrderAdjustments({
    hasServiceFee: adjustmentValues.hasServiceFee ?? false,
    hasDiscount: adjustmentValues.hasDiscount ?? false,
    discountType: adjustmentValues.discountType ?? "percent",
    discountValue: adjustmentValues.discountValue,
  });
  const subtotal = summary.lines.reduce((total, line) => total + line.total, 0);
  const totals = calculateOrderTotals({
    subtotal,
    takeawayFee: summary.takeawayFee,
    isTakeaway: summary.isTakeaway ?? false,
    serviceFeePercent,
    adjustments,
  });
  const orderTotal = totals.total;
  const adjustedSummary: OrderSummaryData = {
    ...summary,
    serviceFee: totals.serviceFee,
    discount: totals.discount,
    total: orderTotal,
  };
  const adjustmentDelta = totals.serviceFee - totals.discount;
  const isDiscountIncomplete =
    (adjustmentValues.hasDiscount ?? false) &&
    (adjustmentValues.discountValue === undefined || !totals.isDiscountValid);
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
  const cashSessionQuery = useOpenCashSessionQuery(organizationId);
  const activeAccounts = useMemo(
    () =>
      (customerAccountsQuery.data ?? []).filter((account) => account.isActive),
    [customerAccountsQuery.data],
  );
  const loyaltyProgram = checkoutSettings.loyaltyProgram;
  const loyaltyForm = useForm<LoyaltyCheckoutFormInput>({
    defaultValues: EMPTY_LOYALTY_CHECKOUT,
  });
  const loyaltyValues = useWatch({ control: loyaltyForm.control });
  const loyaltyPhone = loyaltyProgram ? (loyaltyValues.phone ?? "") : "";
  const loyaltyLookupQuery = useLoyaltyCustomerLookupQuery(
    organizationId,
    loyaltyPhone,
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
      : distributeAdjustment(
          sumAmountsByPerson(
            billUnits,
            assignments,
            peopleCount,
            summary.takeawayFee,
          ),
          subtotal + summary.takeawayFee,
          adjustmentDelta,
        );
  }, [
    isSplit,
    splitMode,
    orderTotal,
    peopleCount,
    billUnits,
    assignments,
    summary.takeawayFee,
    subtotal,
    adjustmentDelta,
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
  const cashInDrawer = cashSessionQuery.data?.expectedCash;
  const isChangeShort =
    cashInDrawer !== undefined && toCents(change) > toCents(cashInDrawer);
  const paymentsError =
    form.formState.errors.payments?.root?.message ?? assignmentError;

  useEffect(() => {
    if (!isOpen) return;
    form.reset({ payments: [EMPTY_PAYMENT_LINE] });
    adjustmentsForm.reset({
      hasServiceFee: isServiceFeeSuggested && canChargeServiceFee,
      hasDiscount: false,
      discountType: "percent",
      discountValue: undefined,
    });
    loyaltyForm.reset(EMPTY_LOYALTY_CHECKOUT);
    setSplitMode("equal");
    setAssignments({});
    setAssignmentError(null);
  }, [
    isOpen,
    form,
    adjustmentsForm,
    loyaltyForm,
    isServiceFeeSuggested,
    canChargeServiceFee,
  ]);

  useEffect(() => {
    if (!computedAmountsKey) return;
    computedAmountsKey.split("|").forEach((amount, index) => {
      form.setValue(`payments.${index}.amount`, Number(amount));
    });
  }, [computedAmountsKey, form]);

  function getLoyaltyCheckout(): LoyaltyCheckoutResult {
    if (!loyaltyPhone) return { status: "valid", input: undefined };
    if (!LOYALTY_PHONE_PATTERN.test(loyaltyPhone)) {
      return { status: "invalid", message: INCOMPLETE_LOYALTY_PHONE_MESSAGE };
    }
    if (
      loyaltyLookupQuery.fetchStatus === "fetching" &&
      loyaltyLookupQuery.data === undefined
    ) {
      return { status: "invalid", message: LOYALTY_LOOKUP_PENDING_MESSAGE };
    }
    const name = loyaltyValues.name?.trim() ?? "";
    if (loyaltyLookupQuery.data === null && !name) {
      return { status: "invalid", message: MISSING_LOYALTY_NAME_MESSAGE };
    }
    return {
      status: "valid",
      input: { phone: loyaltyPhone, name: name || undefined },
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const loyaltyCheckout = getLoyaltyCheckout();
    if (loyaltyCheckout.status === "invalid") {
      event.preventDefault();
      setAssignmentError(loyaltyCheckout.message);
      return;
    }
    if (isDiscountIncomplete) {
      event.preventDefault();
      setAssignmentError(INVALID_DISCOUNT_MESSAGE);
      return;
    }
    if (unassignedCount > 0) {
      event.preventDefault();
      setAssignmentError(UNASSIGNED_ITEMS_MESSAGE);
      return;
    }
    const submitPayments = form.handleSubmit(
      ({ payments: submittedPayments }) =>
        onConfirm(
          submittedPayments,
          { ...adjustments, loyalty: loyaltyCheckout.input },
          orderTotal,
        ),
    );
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
        <OrderSummary summary={adjustedSummary} />
        <OrderAdjustmentsFields
          control={adjustmentsForm.control}
          serviceFeePercent={serviceFeePercent}
          canChargeServiceFee={canChargeServiceFee}
          isDiscountEnabled={checkoutSettings.isDiscountEnabled}
          totals={totals}
        />
        {loyaltyProgram && (
          <LoyaltyCheckoutFields
            organizationId={organizationId}
            program={loyaltyProgram}
            control={loyaltyForm.control}
            orderTotal={orderTotal}
          />
        )}
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
            methods={paymentMethods}
          />
        ))}
        {change > 0 && (
          <div
            className={cn(
              "flex flex-col gap-1 rounded-lg px-4 py-3",
              isChangeShort ? "bg-destructive/10" : "bg-muted",
            )}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-sm">Troco</span>
              <span
                aria-live="polite"
                className={cn(
                  "font-bold text-lg tabular-nums",
                  isChangeShort && "text-destructive",
                )}
              >
                {formatCurrency(change)}
              </span>
            </div>
            {isChangeShort && cashInDrawer !== undefined && (
              <p role="alert" className="text-destructive text-xs">
                Não tem troco suficiente: há{" "}
                {formatCurrency(Math.max(cashInDrawer, 0))} em dinheiro no caixa
              </p>
            )}
          </div>
        )}
        {!isSplit && checkoutSettings.isSplitBillEnabled && (
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
      </FieldGroup>
    </FormDialog>
  );
}
