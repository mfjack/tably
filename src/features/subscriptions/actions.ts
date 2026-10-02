"use server";

import * as z from "zod";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import {
  BILLING_CYCLES,
  type BillingCycle,
  isBillingCycle,
  isSubscriptionPlan,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
} from "./plans";
import {
  type AdminSubscriptionInput,
  adminSubscriptionSchema,
  type SubscriptionPaymentInput,
  subscriptionPaymentSchema,
} from "./schemas";
import type { AdminSubscription } from "./types";

const NOT_ALLOWED_MESSAGE = "Você não tem permissão para isso.";
const INVALID_FORM_MESSAGE = "Confira os campos e tente novamente.";

const adminSubscriptionRowSchema = z.object({
  organizationId: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string(),
  ownerEmail: z.string().nullable(),
  plan: z.enum(SUBSCRIPTION_PLANS),
  billingCycle: z.enum(BILLING_CYCLES),
  monthlyPrice: z.number(),
  yearlyPrice: z.number(),
  trialEndsAt: z.string(),
  paidUntil: z.string().nullable(),
  paymentReportedAt: z.string().nullable(),
  notes: z.string().nullable(),
  payments: z.array(
    z.object({
      id: z.string(),
      amount: z.number(),
      months: z.number(),
      paidUntil: z.string(),
      note: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});

function isPermissionError(error: { code?: string }) {
  return error.code === "42501";
}

export async function chooseSubscriptionPlan(
  organizationId: OrganizationId,
  plan: SubscriptionPlan,
): Promise<ActionResult> {
  if (!isSubscriptionPlan(plan)) return actionFailure(INVALID_FORM_MESSAGE);

  const supabase = await createClient();
  const { error } = await supabase.rpc("choose_subscription_plan", {
    p_organization_id: organizationId,
    p_plan: plan,
  });

  if (error) {
    return actionFailure(
      isPermissionError(error)
        ? "Só o dono do estabelecimento pode trocar o plano."
        : "Não foi possível trocar o plano.",
    );
  }
  return actionSuccess();
}

export async function chooseBillingCycle(
  organizationId: OrganizationId,
  billingCycle: BillingCycle,
): Promise<ActionResult> {
  if (!isBillingCycle(billingCycle)) return actionFailure(INVALID_FORM_MESSAGE);

  const supabase = await createClient();
  const { error } = await supabase.rpc("choose_billing_cycle", {
    p_organization_id: organizationId,
    p_billing_cycle: billingCycle,
  });

  if (error) {
    return actionFailure(
      isPermissionError(error)
        ? "Só o dono do estabelecimento pode trocar a forma de cobrança."
        : "Não foi possível trocar a forma de cobrança.",
    );
  }
  return actionSuccess();
}

export async function reportSubscriptionPayment(
  organizationId: OrganizationId,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_subscription_payment", {
    p_organization_id: organizationId,
  });

  if (error) {
    return actionFailure(
      isPermissionError(error)
        ? NOT_ALLOWED_MESSAGE
        : "Não foi possível avisar o pagamento.",
    );
  }
  return actionSuccess();
}

export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_platform_admin");
  return !error && data === true;
}

export async function listAdminSubscriptions(): Promise<
  ActionResult<AdminSubscription[]>
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_subscriptions");
  const parsedRows = z.array(adminSubscriptionRowSchema).safeParse(data);

  if (error || !parsedRows.success) {
    return actionFailure("Não foi possível carregar os clientes.");
  }

  return actionSuccess(
    parsedRows.data.map((row) => ({
      ...row,
      organizationId: row.organizationId as OrganizationId,
    })),
  );
}

export async function updateAdminSubscription(
  organizationId: OrganizationId,
  input: AdminSubscriptionInput,
): Promise<ActionResult> {
  const parsedInput = adminSubscriptionSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const { plan, billingCycle, monthlyPrice, yearlyPrice, trialEndsAt, notes } =
    parsedInput.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_subscription", {
    p_organization_id: organizationId,
    p_plan: plan,
    p_billing_cycle: billingCycle,
    p_monthly_price: monthlyPrice,
    p_yearly_price: yearlyPrice,
    p_trial_ends_at: `${trialEndsAt}T23:59:59-03:00`,
    p_notes: notes,
  });

  if (error) {
    return actionFailure(
      isPermissionError(error)
        ? NOT_ALLOWED_MESSAGE
        : "Não foi possível salvar o cliente.",
    );
  }
  return actionSuccess();
}

export async function recordSubscriptionPayment(
  organizationId: OrganizationId,
  input: SubscriptionPaymentInput,
): Promise<ActionResult<string>> {
  const parsedInput = subscriptionPaymentSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "admin_record_subscription_payment",
    {
      p_organization_id: organizationId,
      p_amount: parsedInput.data.amount,
      p_months: parsedInput.data.months,
      p_note: parsedInput.data.note,
    },
  );

  if (error) {
    return actionFailure(
      isPermissionError(error)
        ? NOT_ALLOWED_MESSAGE
        : "Não foi possível registrar o pagamento.",
    );
  }
  return actionSuccess(data);
}
