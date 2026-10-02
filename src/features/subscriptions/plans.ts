import type { AppModuleId } from "@/features/organizations/types";
import type { Database } from "@/lib/supabase/database.types";

export type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];

export const SUBSCRIPTION_PLANS = [
  "essential",
  "management",
  "complete",
] as const satisfies readonly SubscriptionPlan[];

const ESSENTIAL_MODULES = [
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
] as const satisfies readonly AppModuleId[];

const COMPLETE_MODULES = [
  ...MANAGEMENT_MODULES,
  "time_clock",
  "employees",
  "payroll",
] as const satisfies readonly AppModuleId[];

export const PLAN_DETAILS = {
  essential: {
    label: "Essencial",
    price: 49,
    modules: ESSENTIAL_MODULES,
  },
  management: {
    label: "Gestão",
    price: 99,
    modules: MANAGEMENT_MODULES,
  },
  complete: {
    label: "Completo",
    price: 149,
    modules: COMPLETE_MODULES,
  },
} as const satisfies Record<
  SubscriptionPlan,
  { label: string; price: number; modules: readonly AppModuleId[] }
>;

export function isSubscriptionPlan(value: string): value is SubscriptionPlan {
  return SUBSCRIPTION_PLANS.some((plan) => plan === value);
}
