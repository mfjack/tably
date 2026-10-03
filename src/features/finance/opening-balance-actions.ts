"use server";

import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import {
  ACCESS_DENIED,
  canUseFinance,
  getDefaultAccountId,
} from "./finance-core";
import { type OpeningBalanceInput, openingBalanceSchema } from "./schemas";

const LOAD_FAILED_MESSAGE = "Não foi possível carregar o saldo inicial.";
const SAVE_FAILED_MESSAGE = "Não foi possível salvar o saldo inicial.";

export async function getOpeningBalance(
  organizationId: OrganizationId,
): Promise<ActionResult<number>> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const accountId = await getDefaultAccountId(organizationId);
  if (!accountId) return actionFailure(LOAD_FAILED_MESSAGE);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_accounts")
    .select("opening_balance")
    .eq("id", accountId)
    .single();

  if (error) return actionFailure(LOAD_FAILED_MESSAGE);
  return actionSuccess(data.opening_balance);
}

export async function saveOpeningBalance(
  organizationId: OrganizationId,
  input: OpeningBalanceInput,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const parsedInput = openingBalanceSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira o valor e tente novamente.");
  }

  const accountId = await getDefaultAccountId(organizationId);
  if (!accountId) return actionFailure(SAVE_FAILED_MESSAGE);

  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_accounts")
    .update({ opening_balance: parsedInput.data.openingBalance ?? 0 })
    .eq("id", accountId)
    .eq("organization_id", organizationId);

  if (error) return actionFailure(SAVE_FAILED_MESSAGE);
  return actionSuccess();
}
