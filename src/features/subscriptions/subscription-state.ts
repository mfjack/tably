import type { AppModuleId } from "@/features/organizations/types";
import {
  type BillingCycle,
  PLAN_DETAILS,
  type SubscriptionPlan,
} from "./plans";

export const GRACE_PERIOD_IN_DAYS = 3;
const EXPIRING_SOON_IN_DAYS = {
  monthly: 3,
  yearly: 7,
} as const satisfies Record<BillingCycle, number>;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type Subscription = {
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  monthlyPrice: number;
  yearlyPrice: number;
  trialEndsAt: string;
  paidUntil: string | null;
  paymentReportedAt: string | null;
};

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "courtesy"
  | "grace"
  | "blocked";

export type SubscriptionState = {
  status: SubscriptionStatus;
  accessUntil: Date;
  daysLeft: number;
  chargeAmount: number;
  isPaymentReported: boolean;
  isExpiringSoon: boolean;
  hasAllModules: boolean;
};

export function getSubscriptionState(
  subscription: Subscription,
  now: Date = new Date(),
): SubscriptionState {
  const trialEndsAt = new Date(subscription.trialEndsAt);
  const paidUntil = subscription.paidUntil
    ? new Date(subscription.paidUntil)
    : null;
  const accessUntil =
    paidUntil && paidUntil > trialEndsAt ? paidUntil : trialEndsAt;
  const isPaid = paidUntil !== null && now <= paidUntil;
  const isTrial = !isPaid && now <= trialEndsAt;
  const chargeAmount = getSubscriptionChargeAmount(subscription);
  const isCourtesy = chargeAmount <= 0;
  const graceEndsAt = new Date(
    accessUntil.getTime() + GRACE_PERIOD_IN_DAYS * DAY_IN_MS,
  );
  const status: SubscriptionStatus = isPaid
    ? "active"
    : isTrial
      ? "trial"
      : isCourtesy
        ? "courtesy"
        : now <= graceEndsAt
          ? "grace"
          : "blocked";
  const daysLeft = Math.max(
    Math.floor((accessUntil.getTime() - now.getTime()) / DAY_IN_MS),
    0,
  );

  return {
    status,
    accessUntil,
    daysLeft,
    chargeAmount,
    isPaymentReported: subscription.paymentReportedAt !== null,
    isExpiringSoon:
      status === "grace" ||
      (!isCourtesy &&
        (status === "trial" || status === "active") &&
        daysLeft <= EXPIRING_SOON_IN_DAYS[subscription.billingCycle]),
    hasAllModules: status === "trial",
  };
}

export function getSubscriptionChargeAmount(
  subscription: Pick<
    Subscription,
    "billingCycle" | "monthlyPrice" | "yearlyPrice"
  >,
): number {
  return subscription.billingCycle === "yearly"
    ? subscription.yearlyPrice
    : subscription.monthlyPrice;
}

export type OperatorLimit = {
  maxOperators: number;
  planLabel: string;
};

export function getOperatorLimit(
  subscription: Subscription | null,
): OperatorLimit | null {
  if (!subscription) return null;
  if (getSubscriptionState(subscription).hasAllModules) return null;

  const { operatorLimit, label } = PLAN_DETAILS[subscription.plan];
  return operatorLimit === null
    ? null
    : { maxOperators: operatorLimit, planLabel: label };
}

export function getPlanHiddenModules(
  subscription: Subscription | null,
  allModuleIds: readonly AppModuleId[],
): AppModuleId[] {
  if (!subscription) return [];
  if (getSubscriptionState(subscription).hasAllModules) return [];

  const planModules: readonly AppModuleId[] =
    PLAN_DETAILS[subscription.plan].modules;
  return allModuleIds.filter((moduleId) => !planModules.includes(moduleId));
}
