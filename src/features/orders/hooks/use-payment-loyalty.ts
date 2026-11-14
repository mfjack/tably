import { useCallback, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  EMPTY_LOYALTY_CHECKOUT,
  type LoyaltyCheckoutFormInput,
  type LoyaltyRewardOption,
} from "@/features/loyalty/components/loyalty-checkout-fields";
import { useLoyaltyCustomerLookupQuery } from "@/features/loyalty/hooks/use-loyalty-customer-lookup-query";
import {
  LOYALTY_PHONE_PATTERN,
  type LoyaltyCheckoutInput,
} from "@/features/loyalty/schemas";
import type { LoyaltyProgram } from "@/features/loyalty/types";
import type { OrganizationId } from "@/features/organizations/types";
import type { OrderSummaryLine } from "../components/order-summary";

const INCOMPLETE_LOYALTY_PHONE_MESSAGE =
  "Complete o celular da fidelidade ou apague o campo.";
const LOYALTY_LOOKUP_PENDING_MESSAGE = "Aguarde a busca do cliente.";
const MISSING_LOYALTY_NAME_MESSAGE = "Informe o nome do cliente novo.";

export type LoyaltyCheckoutResult =
  | { status: "valid"; input: LoyaltyCheckoutInput | undefined }
  | { status: "invalid"; message: string };

function getRewardOptions(
  lines: readonly OrderSummaryLine[],
): LoyaltyRewardOption[] {
  const optionsByProductId = new Map<string, LoyaltyRewardOption>();
  for (const line of lines) {
    const rewardPrice = line.rewardPrice ?? line.unitPrice;
    if (!line.productId || rewardPrice === undefined) continue;
    const currentOption = optionsByProductId.get(line.productId);
    if (currentOption && currentOption.unitPrice >= rewardPrice) continue;
    optionsByProductId.set(line.productId, {
      productId: line.productId,
      productName: line.productName,
      unitPrice: rewardPrice,
    });
  }
  return [...optionsByProductId.values()];
}

type PaymentLoyaltyOptions = {
  organizationId: OrganizationId;
  loyaltyProgram: LoyaltyProgram | null;
  lines: readonly OrderSummaryLine[];
  subtotal: number;
};

export function usePaymentLoyalty({
  organizationId,
  loyaltyProgram,
  lines,
  subtotal,
}: PaymentLoyaltyOptions) {
  const [selectedRewardProductId, setSelectedRewardProductId] = useState<
    string | null
  >(null);
  const rewardOptions = useMemo(() => getRewardOptions(lines), [lines]);
  const form = useForm<LoyaltyCheckoutFormInput>({
    defaultValues: EMPTY_LOYALTY_CHECKOUT,
  });
  const values = useWatch({ control: form.control });
  const phone = loyaltyProgram ? (values.phone ?? "") : "";
  const lookupQuery = useLoyaltyCustomerLookupQuery(organizationId, phone);
  const customer = lookupQuery.data;
  const isRewardAvailable =
    loyaltyProgram !== null &&
    LOYALTY_PHONE_PATTERN.test(phone) &&
    customer !== undefined &&
    customer !== null &&
    customer.balance >= loyaltyProgram.stampsRequired;
  const rewardOption = isRewardAvailable
    ? rewardOptions.find(
        (option) => option.productId === selectedRewardProductId,
      )
    : undefined;
  const rewardAmount = Math.min(rewardOption?.unitPrice ?? 0, subtotal);

  function getLoyaltyCheckout(): LoyaltyCheckoutResult {
    if (!phone) return { status: "valid", input: undefined };
    if (!LOYALTY_PHONE_PATTERN.test(phone)) {
      return { status: "invalid", message: INCOMPLETE_LOYALTY_PHONE_MESSAGE };
    }
    if (
      lookupQuery.fetchStatus === "fetching" &&
      lookupQuery.data === undefined
    ) {
      return { status: "invalid", message: LOYALTY_LOOKUP_PENDING_MESSAGE };
    }
    const name = values.name?.trim() ?? "";
    if (lookupQuery.data === null && !name) {
      return { status: "invalid", message: MISSING_LOYALTY_NAME_MESSAGE };
    }
    return {
      status: "valid",
      input: {
        phone,
        name: name || undefined,
        rewardProductId: rewardOption?.productId,
      },
    };
  }

  const reset = useCallback(() => {
    form.reset(EMPTY_LOYALTY_CHECKOUT);
    setSelectedRewardProductId(null);
  }, [form]);

  return {
    control: form.control,
    rewardOptions,
    selectedRewardProductId,
    selectRewardProduct: setSelectedRewardProductId,
    isRewardAvailable,
    rewardOption,
    rewardAmount,
    getLoyaltyCheckout,
    reset,
  };
}
