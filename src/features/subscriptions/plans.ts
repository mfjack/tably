import type { AppModuleId } from "@/features/organizations/types";
import type { Database } from "@/lib/supabase/database.types";

export type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];

export type BillingCycle = Database["public"]["Enums"]["billing_cycle"];

export const BILLING_CYCLES = [
  "monthly",
  "yearly",
] as const satisfies readonly BillingCycle[];

export const BILLING_CYCLE_LABELS = {
  monthly: "Mensal",
  yearly: "Anual",
} as const satisfies Record<BillingCycle, string>;

export const BILLING_CYCLE_MONTHS = {
  monthly: 1,
  yearly: 12,
} as const satisfies Record<BillingCycle, number>;

export const YEARLY_PRICE_MONTHS = 10;

export const SUBSCRIPTION_PLANS = [
  "essential",
  "management",
  "complete",
] as const satisfies readonly SubscriptionPlan[];

const ESSENTIAL_MODULES = [
  "dashboard",
  "pos",
  "order_tabs",
  "kitchen",
  "tasks",
  "products",
  "categories",
  "sales_report",
] as const satisfies readonly AppModuleId[];

const MANAGEMENT_MODULES = [
  ...ESSENTIAL_MODULES,
  "customer_accounts",
  "ingredients",
  "suppliers",
  "finance",
  "documents",
  "loyalty",
] as const satisfies readonly AppModuleId[];

const COMPLETE_MODULES = [
  ...MANAGEMENT_MODULES,
  "time_clock",
  "employees",
  "payroll",
] as const satisfies readonly AppModuleId[];

export const PLAN_DETAILS = {
  essential: {
    label: "Balcão",
    price: 49,
    yearlyPrice: 490,
    modules: ESSENTIAL_MODULES,
    operatorLimit: 2,
  },
  management: {
    label: "Gestão",
    price: 99,
    yearlyPrice: 990,
    modules: MANAGEMENT_MODULES,
    operatorLimit: 5,
  },
  complete: {
    label: "Equipe",
    price: 149,
    yearlyPrice: 1490,
    modules: COMPLETE_MODULES,
    operatorLimit: null,
  },
} as const satisfies Record<
  SubscriptionPlan,
  {
    label: string;
    price: number;
    yearlyPrice: number;
    modules: readonly AppModuleId[];
    operatorLimit: number | null;
  }
>;

export function isBillingCycle(value: string): value is BillingCycle {
  return BILLING_CYCLES.some((cycle) => cycle === value);
}

export function isSubscriptionPlan(value: string): value is SubscriptionPlan {
  return SUBSCRIPTION_PLANS.some((plan) => plan === value);
}

export type PlanSelection = {
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
};

export function parsePlanSelection(
  plan: unknown,
  billingCycle: unknown,
): PlanSelection | null {
  if (typeof plan !== "string" || !isSubscriptionPlan(plan)) return null;
  return {
    plan,
    billingCycle:
      typeof billingCycle === "string" && isBillingCycle(billingCycle)
        ? billingCycle
        : "monthly",
  };
}

export function buildPlanSelectionQuery({
  plan,
  billingCycle,
}: PlanSelection): string {
  return new URLSearchParams({ plan, cycle: billingCycle }).toString();
}

export function describePlanSelection({
  plan,
  billingCycle,
}: PlanSelection): string {
  const cycleLabel =
    billingCycle === "yearly" ? "cobrança anual" : "cobrança mensal";
  return `Plano ${PLAN_DETAILS[plan].label}, ${cycleLabel}`;
}
