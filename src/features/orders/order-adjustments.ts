import * as z from "zod";
import { loyaltyCheckoutSchema } from "@/features/loyalty/schemas";

export const DISCOUNT_TYPES = ["percent", "amount"] as const;

export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const MAX_SERVICE_FEE_PERCENT = 30;

export const orderDiscountSchema = z.object({
  type: z.enum(DISCOUNT_TYPES),
  value: z.number().positive(),
});

export const orderAdjustmentsSchema = z.object({
  discount: orderDiscountSchema.optional(),
  hasServiceFee: z.boolean(),
  loyalty: loyaltyCheckoutSchema.optional(),
});

export type OrderDiscountInput = z.infer<typeof orderDiscountSchema>;
export type OrderAdjustmentsInput = z.infer<typeof orderAdjustmentsSchema>;

export const NO_ORDER_ADJUSTMENTS: OrderAdjustmentsInput = {
  hasServiceFee: false,
};

type OrderTotalsInput = {
  subtotal: number;
  takeawayFee: number;
  isTakeaway: boolean;
  serviceFeePercent: number;
  adjustments: OrderAdjustmentsInput;
};

export type OrderTotals = {
  subtotal: number;
  takeawayFee: number;
  serviceFee: number;
  discount: number;
  total: number;
  isDiscountValid: boolean;
};

function toCents(value: number) {
  return Math.round(value * 100);
}

function toTenths(percent: number) {
  return Math.round(percent * 10);
}

function applyPercent(amountCents: number, percent: number) {
  return Math.round((amountCents * toTenths(percent)) / 1000);
}

export function calculateOrderTotals({
  subtotal,
  takeawayFee,
  isTakeaway,
  serviceFeePercent,
  adjustments,
}: OrderTotalsInput): OrderTotals {
  const subtotalCents = toCents(subtotal);
  const takeawayFeeCents = toCents(takeawayFee);
  const baseCents = subtotalCents + takeawayFeeCents;
  const serviceFeeCents =
    adjustments.hasServiceFee && !isTakeaway
      ? applyPercent(subtotalCents, serviceFeePercent)
      : 0;
  const { discount } = adjustments;
  const discountCents = !discount
    ? 0
    : discount.type === "percent"
      ? applyPercent(baseCents, discount.value)
      : toCents(discount.value);
  const isDiscountValid =
    !discount ||
    (discount.type === "percent"
      ? toTenths(discount.value) > 0 && toTenths(discount.value) < 1000
      : discountCents > 0 && discountCents < baseCents);

  return {
    subtotal,
    takeawayFee,
    serviceFee: serviceFeeCents / 100,
    discount: isDiscountValid ? discountCents / 100 : 0,
    total:
      (baseCents + serviceFeeCents - (isDiscountValid ? discountCents : 0)) /
      100,
    isDiscountValid,
  };
}

export function hasLoyaltyReward(
  adjustments: OrderAdjustmentsInput | undefined,
): boolean {
  return Boolean(adjustments?.loyalty?.rewardProductId);
}

export function toOrderAdjustmentsPayload(adjustments: OrderAdjustmentsInput) {
  const rewardProductId = adjustments.loyalty?.rewardProductId;
  return {
    p_discount_type: adjustments.discount?.type,
    p_discount_value: adjustments.discount?.value,
    p_has_service_fee: adjustments.hasServiceFee,
    p_loyalty_phone: rewardProductId ? adjustments.loyalty?.phone : undefined,
    p_loyalty_reward_product_id: rewardProductId,
  };
}
