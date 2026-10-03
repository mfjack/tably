"use server";

import {
  hasAnyModuleAccess,
  hasModuleAccess,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import {
  LOYALTY_PHONE_PATTERN,
  type LoyaltyAdjustmentInput,
  type LoyaltyCustomerInput,
  type LoyaltySettingsInput,
  loyaltyAdjustmentSchema,
  loyaltyCustomerSchema,
  loyaltySettingsSchema,
} from "./schemas";
import type {
  LoyaltyCustomer,
  LoyaltyCustomerId,
  LoyaltyCustomerLookup,
  LoyaltyTransaction,
} from "./types";

const ACCESS_DENIED = actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
const TRANSACTIONS_LIMIT = 100;

const LOYALTY_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  "23505": "Já existe um cliente com esse celular.",
  "42501": "Só o dono ou um gerente pode fazer isso.",
  TB022: "O cliente não tem selos suficientes.",
};

function getLoyaltyErrorMessage(
  error: { code?: string },
  fallbackMessage: string,
) {
  return (error.code && LOYALTY_ERROR_MESSAGES[error.code]) ?? fallbackMessage;
}

export async function saveLoyaltySettings(
  organizationId: OrganizationId,
  input: LoyaltySettingsInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "settings"))) {
    return ACCESS_DENIED;
  }
  const parsedInput = loyaltySettingsSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const settings = parsedInput.data;
  const supabase = await createClient();
  const { error } = await supabase.from("loyalty_settings").upsert({
    organization_id: organizationId,
    is_enabled: settings.isEnabled,
    stamps_required: settings.stampsRequired,
    minimum_purchase: settings.minimumPurchase ?? 0,
    reward_description: settings.rewardDescription,
  });

  if (error) {
    return actionFailure(
      getLoyaltyErrorMessage(error, "Não foi possível salvar a fidelidade."),
    );
  }

  if (settings.isEnabled) {
    await supabase.rpc("grant_module_to_settings_operators", {
      p_organization_id: organizationId,
      p_module: "loyalty",
    });
  }
  return actionSuccess();
}

export async function findLoyaltyCustomer(
  organizationId: OrganizationId,
  phone: string,
): Promise<ActionResult<LoyaltyCustomerLookup | null>> {
  if (
    !(await hasAnyModuleAccess(organizationId, [
      "pos",
      "order_tabs",
      "loyalty",
    ]))
  ) {
    return ACCESS_DENIED;
  }
  if (!LOYALTY_PHONE_PATTERN.test(phone)) return actionSuccess(null);

  const supabase = await createClient();
  const { data: customer, error } = await supabase
    .from("loyalty_customers")
    .select("id, name, phone")
    .eq("organization_id", organizationId)
    .eq("phone", phone)
    .maybeSingle();

  if (error) return actionFailure("Não foi possível buscar o cliente.");
  if (!customer) return actionSuccess(null);

  const [balanceResult, stampTodayResult] = await Promise.all([
    supabase.rpc("get_loyalty_balance", { p_customer_id: customer.id }),
    supabase.rpc("has_loyalty_stamp_today", { p_customer_id: customer.id }),
  ]);
  if (balanceResult.error || stampTodayResult.error) {
    return actionFailure("Não foi possível buscar o cliente.");
  }

  return actionSuccess({
    id: customer.id as LoyaltyCustomerId,
    name: customer.name,
    phone: customer.phone,
    balance: balanceResult.data,
    hasStampToday: stampTodayResult.data,
  });
}

export async function redeemLoyaltyReward(
  organizationId: OrganizationId,
  customerId: LoyaltyCustomerId,
): Promise<ActionResult> {
  if (
    !(await hasAnyModuleAccess(organizationId, [
      "pos",
      "order_tabs",
      "loyalty",
    ]))
  ) {
    return ACCESS_DENIED;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_loyalty_reward", {
    p_customer_id: customerId,
  });

  if (error) {
    return actionFailure(
      getLoyaltyErrorMessage(error, "Não foi possível resgatar o prêmio."),
    );
  }
  return actionSuccess();
}

export async function listLoyaltyCustomers(
  organizationId: OrganizationId,
): Promise<ActionResult<LoyaltyCustomer[]>> {
  if (!(await hasModuleAccess(organizationId, "loyalty"))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_loyalty_customers", {
    p_organization_id: organizationId,
  });
  if (error) return actionFailure("Não foi possível carregar os clientes.");

  return actionSuccess(
    data.map((customer) => ({
      id: customer.id as LoyaltyCustomerId,
      name: customer.name,
      phone: customer.phone,
      balance: customer.balance,
      totalEarned: customer.total_earned,
      totalRedeemed: customer.total_redeemed,
      lastVisitAt: customer.last_visit_at,
    })),
  );
}

export async function listLoyaltyTransactions(
  organizationId: OrganizationId,
  customerId: LoyaltyCustomerId,
): Promise<ActionResult<LoyaltyTransaction[]>> {
  if (!(await hasModuleAccess(organizationId, "loyalty"))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select("id, kind, stamps, note, created_by_name, created_at")
    .eq("organization_id", organizationId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(TRANSACTIONS_LIMIT);

  if (error) return actionFailure("Não foi possível carregar o histórico.");

  return actionSuccess(
    data.map((transaction) => ({
      id: transaction.id,
      kind: transaction.kind,
      stamps: transaction.stamps,
      note: transaction.note,
      createdByName: transaction.created_by_name,
      createdAt: transaction.created_at,
    })),
  );
}

export async function createLoyaltyCustomer(
  organizationId: OrganizationId,
  input: LoyaltyCustomerInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "loyalty"))) return ACCESS_DENIED;
  const parsedInput = loyaltyCustomerSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const { name, phone, initialStamps } = parsedInput.data;
  const supabase = await createClient();
  const { data: customer, error } = await supabase
    .from("loyalty_customers")
    .insert({ organization_id: organizationId, name, phone })
    .select("id")
    .single();

  if (error) {
    return actionFailure(
      getLoyaltyErrorMessage(error, "Não foi possível cadastrar o cliente."),
    );
  }

  if (initialStamps) {
    const { error: adjustError } = await supabase.rpc("adjust_loyalty_stamps", {
      p_customer_id: customer.id,
      p_stamps: initialStamps,
      p_note: "Selos iniciais",
    });
    if (adjustError) {
      return actionFailure(
        "Cliente cadastrado, mas não foi possível lançar os selos iniciais.",
      );
    }
  }

  return actionSuccess();
}

export async function adjustLoyaltyStamps(
  organizationId: OrganizationId,
  customerId: LoyaltyCustomerId,
  input: LoyaltyAdjustmentInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "loyalty"))) return ACCESS_DENIED;
  const parsedInput = loyaltyAdjustmentSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("adjust_loyalty_stamps", {
    p_customer_id: customerId,
    p_stamps: parsedInput.data.stamps,
    p_note: parsedInput.data.note,
  });

  if (error) {
    return actionFailure(
      getLoyaltyErrorMessage(error, "Não foi possível ajustar os selos."),
    );
  }
  return actionSuccess();
}
