import "server-only";

import type { OrganizationId } from "@/features/organizations/types";
import { asaasRequest } from "@/lib/asaas/client";
import type {
  AsaasList,
  AsaasPayment,
  AsaasSubscription,
} from "@/lib/asaas/types";
import { isAsaasConfigured } from "@/lib/server-env";
import { createClient } from "@/lib/supabase/server";
import type { BillingCycle } from "./plans";
import { getSubscriptionChargeAmount } from "./subscription-state";

const ASAAS_CYCLES = {
  monthly: "MONTHLY",
  yearly: "YEARLY",
} as const satisfies Record<BillingCycle, string>;

const PAYABLE_PAYMENT_STATUSES = new Set(["PENDING", "OVERDUE"]);

export function toAsaasCycle(billingCycle: BillingCycle) {
  return ASAAS_CYCLES[billingCycle];
}

export function toAsaasDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export async function findPayableInvoiceUrl(
  asaasSubscriptionId: string,
): Promise<string | null> {
  const payments = await asaasRequest<AsaasList<AsaasPayment>>(
    `/subscriptions/${asaasSubscriptionId}/payments`,
  );
  const payablePayment = payments.data
    .filter((payment) => PAYABLE_PAYMENT_STATUSES.has(payment.status))
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate))[0];
  return payablePayment?.invoiceUrl ?? null;
}

export async function updateAsaasSubscriptionCharge(
  asaasSubscriptionId: string,
  value: number,
  billingCycle: BillingCycle,
): Promise<void> {
  await asaasRequest<AsaasSubscription>(
    `/subscriptions/${asaasSubscriptionId}`,
    {
      method: "POST",
      body: {
        value,
        cycle: toAsaasCycle(billingCycle),
        updatePendingPayments: true,
      },
    },
  );
}

export async function cancelAsaasSubscription(
  asaasSubscriptionId: string,
): Promise<void> {
  await asaasRequest(`/subscriptions/${asaasSubscriptionId}`, {
    method: "DELETE",
  });
}

export async function syncAsaasSubscriptionCharge(
  organizationId: OrganizationId,
): Promise<void> {
  if (!isAsaasConfigured()) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("billing_cycle, monthly_price, yearly_price, asaas_subscription_id")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!data?.asaas_subscription_id) return;

  try {
    await updateAsaasSubscriptionCharge(
      data.asaas_subscription_id,
      getSubscriptionChargeAmount({
        billingCycle: data.billing_cycle,
        monthlyPrice: data.monthly_price,
        yearlyPrice: data.yearly_price,
      }),
      data.billing_cycle,
    );
  } catch (error) {
    console.error("Asaas subscription sync failed", error);
  }
}
