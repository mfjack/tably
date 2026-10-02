import type { OrganizationId } from "@/features/organizations/types";
import type { BillingCycle, SubscriptionPlan } from "./plans";

export type SubscriptionPaymentRecord = {
  id: string;
  amount: number;
  months: number;
  paidUntil: string;
  note: string | null;
  createdAt: string;
};

export type AdminSubscription = {
  organizationId: OrganizationId;
  name: string;
  slug: string;
  createdAt: string;
  ownerEmail: string | null;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  monthlyPrice: number;
  yearlyPrice: number;
  trialEndsAt: string;
  paidUntil: string | null;
  paymentReportedAt: string | null;
  notes: string | null;
  payments: SubscriptionPaymentRecord[];
};
