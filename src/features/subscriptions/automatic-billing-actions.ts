"use server";

import { getCurrentUser } from "@/features/auth/queries";
import { getUserOrganizationById } from "@/features/organizations/queries";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { AsaasError, asaasRequest } from "@/lib/asaas/client";
import type { AsaasCustomer, AsaasSubscription } from "@/lib/asaas/types";
import { isAsaasConfigured } from "@/lib/server-env";
import { createClient } from "@/lib/supabase/server";
import {
  findPayableInvoiceUrl,
  toAsaasCycle,
  toAsaasDate,
} from "./automatic-billing";
import {
  type AutomaticBillingInput,
  automaticBillingSchema,
} from "./automatic-billing-schemas";
import { PLAN_DETAILS } from "./plans";
import { getSubscriptionState } from "./subscription-state";

const ONLY_OWNER_MESSAGE = "Só o dono do estabelecimento pode fazer isso.";
const NOT_CONFIGURED_MESSAGE =
  "A cobrança automática ainda não está disponível.";
const NO_INVOICE_MESSAGE = "Nenhuma cobrança em aberto no momento.";
const ASAAS_MINIMUM_CHARGE = 5;

function toAsaasFailure(error: unknown, fallbackMessage: string) {
  return actionFailure(
    error instanceof AsaasError && error.status < 500
      ? error.message
      : fallbackMessage,
  );
}

async function getAsaasIds(organizationId: OrganizationId) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("asaas_customer_id, asaas_subscription_id")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return {
    customerId: data?.asaas_customer_id ?? null,
    subscriptionId: data?.asaas_subscription_id ?? null,
  };
}

export async function startAutomaticBilling(
  organizationId: OrganizationId,
  input: AutomaticBillingInput,
): Promise<ActionResult<string>> {
  if (!isAsaasConfigured()) return actionFailure(NOT_CONFIGURED_MESSAGE);
  const parsedInput = automaticBillingSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const [organization, currentUser] = await Promise.all([
    getUserOrganizationById(organizationId),
    getCurrentUser(),
  ]);
  if (!organization?.subscription || organization.role !== "owner") {
    return actionFailure(ONLY_OWNER_MESSAGE);
  }

  const { subscription } = organization;
  const state = getSubscriptionState(subscription);
  const { billingType, taxId } = parsedInput.data;
  if (state.chargeAmount < ASAAS_MINIMUM_CHARGE) {
    return actionFailure("O valor mínimo para cobrança automática é R$ 5,00.");
  }

  try {
    const supabase = await createClient();
    const asaasIds = await getAsaasIds(organizationId);
    let customerId = asaasIds.customerId;
    if (!customerId) {
      const customer = await asaasRequest<AsaasCustomer>("/customers", {
        method: "POST",
        body: {
          name: organization.name,
          cpfCnpj: taxId,
          email: currentUser?.email,
          externalReference: organizationId,
          notificationDisabled: false,
        },
      });
      customerId = customer.id;
      const { error } = await supabase.rpc("save_asaas_customer", {
        p_organization_id: organizationId,
        p_customer_id: customerId,
      });
      if (error) return actionFailure("Não foi possível salvar o cliente.");
    }

    if (asaasIds.subscriptionId) {
      await asaasRequest(`/subscriptions/${asaasIds.subscriptionId}`, {
        method: "DELETE",
      });
    }

    const now = new Date();
    const asaasSubscription = await asaasRequest<AsaasSubscription>(
      "/subscriptions",
      {
        method: "POST",
        body: {
          customer: customerId,
          billingType,
          value: state.chargeAmount,
          nextDueDate: toAsaasDate(
            state.accessUntil > now ? state.accessUntil : now,
          ),
          cycle: toAsaasCycle(subscription.billingCycle),
          description: `Tably · Plano ${PLAN_DETAILS[subscription.plan].label} · ${organization.name}`,
          externalReference: organizationId,
        },
      },
    );

    const { error } = await supabase.rpc("save_asaas_subscription", {
      p_organization_id: organizationId,
      p_customer_id: customerId,
      p_subscription_id: asaasSubscription.id,
      p_billing_type: billingType,
    });
    if (error) return actionFailure("Não foi possível salvar a assinatura.");

    const invoiceUrl = await findPayableInvoiceUrl(asaasSubscription.id);
    if (!invoiceUrl) return actionFailure(NO_INVOICE_MESSAGE);
    return actionSuccess(invoiceUrl);
  } catch (error) {
    return toAsaasFailure(error, "Não foi possível ativar a cobrança.");
  }
}

export async function getAutomaticBillingInvoiceUrl(
  organizationId: OrganizationId,
): Promise<ActionResult<string>> {
  if (!isAsaasConfigured()) return actionFailure(NOT_CONFIGURED_MESSAGE);
  const organization = await getUserOrganizationById(organizationId);
  if (organization?.role !== "owner") {
    return actionFailure(ONLY_OWNER_MESSAGE);
  }

  try {
    const { subscriptionId } = await getAsaasIds(organizationId);
    if (!subscriptionId) return actionFailure(NO_INVOICE_MESSAGE);
    const invoiceUrl = await findPayableInvoiceUrl(subscriptionId);
    if (!invoiceUrl) return actionFailure(NO_INVOICE_MESSAGE);
    return actionSuccess(invoiceUrl);
  } catch (error) {
    return toAsaasFailure(error, "Não foi possível abrir a cobrança.");
  }
}
