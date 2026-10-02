import type { AppModuleId } from "@/features/organizations/types";
import { PLAN_DETAILS, type SubscriptionPlan } from "./plans";

export const GRACE_PERIOD_IN_DAYS = 3;
export const EXPIRING_SOON_IN_DAYS = 3;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type Subscription = {
  plan: SubscriptionPlan;
  monthlyPrice: number;
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
  const isCourtesy = subscription.monthlyPrice <= 0;
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
    isPaymentReported: subscription.paymentReportedAt !== null,
    isExpiringSoon:
      status === "grace" ||
      (!isCourtesy &&
        (status === "trial" || status === "active") &&
        daysLeft <= EXPIRING_SOON_IN_DAYS),
    hasAllModules: status === "trial",
  };
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
