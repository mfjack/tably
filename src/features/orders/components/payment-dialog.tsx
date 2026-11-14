"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Split, UserPlus } from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  FormDialog,
  type FormDialogSecondaryAction,
} from "@/components/dialog/form-dialog";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOpenCashSessionQuery } from "@/features/cash-register/hooks/use-open-cash-session-query";
import { CustomerAccountFormDialog } from "@/features/customer-accounts/components/customer-account-form-dialog";
import { useCustomerAccountsQuery } from "@/features/customer-accounts/hooks/use-customer-accounts-query";
import { LoyaltyCheckoutFields } from "@/features/loyalty/components/loyalty-checkout-fields";
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
import { toCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { usePaymentLoyalty } from "../hooks/use-payment-loyalty";
import {
  calculateOrderTotals,
  type OrderAdjustmentsInput,
} from "../order-adjustments";
import { getPaymentsChange, isCustomerAccountOnly } from "../order-payments";
import { sortPaymentMethods } from "../payment-methods";
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
  orderPicker?: ReactNode;
};

const MAX_PEOPLE = 10;
const UNASSIGNED_ITEMS_MESSAGE = "Escolha quem paga cada item.";

const EMPTY_PAYMENT_LINE = {} as PaymentFormInput["payments"][number];

const INVALID_DISCOUNT_MESSAGE = "Confira o valor do desconto.";
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
  orderPicker,
}: PaymentDialogProps) {
  const serviceFeePercent = checkoutSettings.isServiceFeeEnabled
    ? checkoutSettings.serviceFeePercent
    : 0;
  const canChargeServiceFee = !summary.isTakeaway && serviceFeePercent > 0;
  const paymentMethods = sortPaymentMethods([
    ...checkoutSettings.acceptedPaymentMethods,
    ...(checkoutSettings.isCustomerAccountPaymentEnabled
      ? (["customer_account"] as const)
      : []),
  ]);
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
  const loyaltyProgram = checkoutSettings.loyaltyProgram;
  const loyalty = usePaymentLoyalty({
    organizationId,
    loyaltyProgram,
    lines: summary.lines,
    subtotal,
  });
  const { rewardOption, rewardAmount } = loyalty;
  const totals = calculateOrderTotals({
    subtotal: subtotal - rewardAmount,
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
    loyaltyReward: rewardOption
      ? { productName: rewardOption.productName, amount: rewardAmount }
      : undefined,
    total: orderTotal,
  };
  const isPaidByReward = rewardOption !== undefined && orderTotal === 0;
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
  const [accountFormLineIndex, setAccountFormLineIndex] = useState<
    number | null
  >(null);
  const customerAccountsQuery = useCustomerAccountsQuery(organizationId);
  const cashSessionQuery = useOpenCashSessionQuery(organizationId);
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

  const resetLoyalty = loyalty.reset;

  useEffect(() => {
    if (!isOpen) return;
    form.reset({ payments: [EMPTY_PAYMENT_LINE] });
    adjustmentsForm.reset({
      hasServiceFee: isServiceFeeSuggested && canChargeServiceFee,
      hasDiscount: false,
      discountType: "percent",
      discountValue: undefined,
    });
    resetLoyalty();
    setSplitMode("equal");
    setAssignments({});
    setAssignmentError(null);
  }, [
    isOpen,
    form,
    adjustmentsForm,
    resetLoyalty,
    isServiceFeeSuggested,
    canChargeServiceFee,
  ]);

  useEffect(() => {
    if (!computedAmountsKey) return;
    computedAmountsKey.split("|").forEach((amount, index) => {
      form.setValue(`payments.${index}.amount`, Number(amount));
    });
  }, [computedAmountsKey, form]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const loyaltyCheckout = loyalty.getLoyaltyCheckout();
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
    if (isPaidByReward) {
      event.preventDefault();
      onConfirm([], { ...adjustments, loyalty: loyaltyCheckout.input }, 0);
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

  function addPaymentLine() {
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
    <>
      <FormDialog
        isOpen={isOpen}
        onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
        title={title}
        submitLabel={
          isCustomerAccountOnly(payments ?? [])
            ? "Lançar na conta"
            : submitLabel
        }
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        secondaryAction={secondaryAction}
      >
        <FieldGroup>
          {orderPicker}
          <OrderSummary
            summary={adjustedSummary}
            isItemListHidden={Boolean(orderPicker)}
          />
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
              control={loyalty.control}
              orderTotal={orderTotal}
              rewardOptions={loyalty.rewardOptions}
              rewardProductId={loyalty.selectedRewardProductId}
              isRewardAvailable={loyalty.isRewardAvailable && !isSplit}
              onRewardProductChange={loyalty.selectRewardProduct}
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
          {!isPaidByReward &&
            fields.map((field, index) => (
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
                paymentFees={checkoutSettings.paymentFees}
                onCreateAccount={setAccountFormLineIndex}
              />
            ))}
          {isPaidByReward && (
            <p className="rounded-lg bg-primary/10 px-4 py-3 font-medium text-primary text-sm">
              O prêmio cobre o pedido. Não precisa escolher forma de pagamento.
            </p>
          )}
          {!isPaidByReward && change > 0 && (
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
                  {formatCurrency(Math.max(cashInDrawer, 0))} em dinheiro no
                  caixa
                </p>
              )}
            </div>
          )}
          {!isSplit && !rewardOption && checkoutSettings.isSplitBillEnabled && (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={addPaymentLine}
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
              onClick={addPaymentLine}
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
      <CustomerAccountFormDialog
        organizationId={organizationId}
        isOpen={accountFormLineIndex !== null}
        initialName={summary.customerName ?? ""}
        onClose={() => setAccountFormLineIndex(null)}
        onSaved={(accountId) => {
          if (accountFormLineIndex === null) return;
          form.setValue(
            `payments.${accountFormLineIndex}.customerAccountId`,
            accountId,
            { shouldValidate: true },
          );
        }}
      />
    </>
  );
}
