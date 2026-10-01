"use server";

import {
  hasModuleAccess,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";

import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import {
  type CheckoutSettingsInput,
  type CreateOrganizationInput,
  checkoutSettingsSchema,
  createOrganizationSchema,
  type OrganizationSettingsInput,
  organizationSettingsSchema,
} from "./schemas";
import { buildSlugCandidate, slugify } from "./slug";
import type { OrganizationId } from "./types";

const MAX_SLUG_ATTEMPTS = 5;
const UNIQUE_VIOLATION_CODE = "23505";
const FORBIDDEN_MESSAGE =
  "Só o dono ou um gerente pode alterar o estabelecimento.";

export type CreatedOrganization = { slug: string };

export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<ActionResult<CreatedOrganization>> {
  const parsedInput = createOrganizationSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const { name } = parsedInput.data;
  const baseSlug = slugify(name);
  const supabase = await createClient();

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const { data, error } = await supabase.rpc("create_organization", {
      p_name: name,
      p_slug: buildSlugCandidate(baseSlug, attempt),
    });

    if (!error) return actionSuccess({ slug: data.slug });
    if (error.code !== UNIQUE_VIOLATION_CODE) break;
  }

  return actionFailure(
    "Não foi possível criar o estabelecimento. Tente novamente.",
  );
}

export async function updateOrganizationSettings(
  organizationId: OrganizationId,
  input: OrganizationSettingsInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "settings"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const parsedInput = organizationSettingsSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({
      name: parsedInput.data.name,
      tax_id: parsedInput.data.taxId || null,
      phone: parsedInput.data.phone || null,
      address: parsedInput.data.address || null,
      is_takeaway_enabled: parsedInput.data.isTakeawayEnabled,
      takeaway_fee: parsedInput.data.takeawayFee ?? 0,
    })
    .eq("id", organizationId)
    .select("id");

  if (error) return actionFailure("Não foi possível salvar as alterações.");
  if (data.length === 0) return actionFailure(FORBIDDEN_MESSAGE);

  return actionSuccess();
}

export async function updateCheckoutSettings(
  organizationId: OrganizationId,
  input: CheckoutSettingsInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "settings"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const parsedInput = checkoutSettingsSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const { serviceFeePercent, ...settings } = parsedInput.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({
      is_service_fee_enabled: settings.isServiceFeeEnabled,
      ...(serviceFeePercent !== undefined
        ? { service_fee_percent: serviceFeePercent }
        : {}),
      is_discount_enabled: settings.isDiscountEnabled,
      is_split_bill_enabled: settings.isSplitBillEnabled,
      is_customer_account_payment_enabled:
        settings.isCustomerAccountPaymentEnabled,
    })
    .eq("id", organizationId)
    .select("id");

  if (error) return actionFailure("Não foi possível salvar as alterações.");
  if (data.length === 0) return actionFailure(FORBIDDEN_MESSAGE);

  return actionSuccess();
}
