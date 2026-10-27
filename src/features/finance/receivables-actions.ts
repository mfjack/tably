"use server";

import * as z from "zod";
import type { OrganizationId } from "@/features/organizations/types";
import { getOrganizationClock } from "@/features/time-clock/load-timesheet";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { ACCESS_DENIED, canUseFinance } from "./finance-core";
import {
  type PaymentReceivables,
  type PaymentSettlementInput,
  type PaymentSettlementKey,
  paymentReceivableSchema,
  paymentSettlementKeySchema,
  paymentSettlementSchema,
} from "./receivables";

const LOAD_FAILED_MESSAGE = "Não foi possível carregar os recebimentos.";

const dateRangeSchema = z.object({
  startDate: z.iso.date(),
  endDate: z.iso.date(),
});

export async function getPaymentReceivables(
  organizationId: OrganizationId,
  startDate: string,
  endDate: string,
): Promise<ActionResult<PaymentReceivables>> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;
  if (!dateRangeSchema.safeParse({ startDate, endDate }).success) {
    return actionFailure("Período inválido.");
  }

  const clock = await getOrganizationClock(organizationId);
  if (!clock) return actionFailure(LOAD_FAILED_MESSAGE);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_payment_receivables", {
    p_organization_id: organizationId,
    p_from: startDate,
    p_to: endDate,
  });

  const parsedReceivables = z.array(paymentReceivableSchema).safeParse(data);
  if (error || !parsedReceivables.success) {
    return actionFailure(LOAD_FAILED_MESSAGE);
  }
  return actionSuccess({
    today: clock.today,
    receivables: parsedReceivables.data,
  });
}

export async function confirmPaymentSettlement(
  organizationId: OrganizationId,
  input: PaymentSettlementInput,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;
  const parsedInput = paymentSettlementSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira o valor e tente novamente.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_payment_settlement", {
    p_organization_id: organizationId,
    p_sale_date: parsedInput.data.saleDate,
    p_method: parsedInput.data.method,
    p_received_amount: parsedInput.data.receivedAmount,
  });

  if (error)
    return databaseFailure("Não foi possível confirmar o recebimento.", error);
  return actionSuccess();
}

export async function undoPaymentSettlement(
  organizationId: OrganizationId,
  key: PaymentSettlementKey,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;
  const parsedKey = paymentSettlementKeySchema.safeParse(key);
  if (!parsedKey.success) return actionFailure(LOAD_FAILED_MESSAGE);

  const supabase = await createClient();
  const { error } = await supabase.rpc("undo_payment_settlement", {
    p_organization_id: organizationId,
    p_sale_date: parsedKey.data.saleDate,
    p_method: parsedKey.data.method,
  });

  if (error)
    return databaseFailure("Não foi possível desfazer a confirmação.", error);
  return actionSuccess();
}
