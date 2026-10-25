"use server";

import * as z from "zod";
import type { OrganizationId } from "@/features/organizations/types";
import {
  getMonthEnd,
  getMonthStart,
  isMonthKey,
  shiftMonthKey,
} from "@/features/time-clock/time-utils";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { Constants } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  ACCESS_DENIED,
  canUseFinance,
  ensureFinanceDefaults,
} from "../finance-core";
import type { IncomeStatementData, IncomeStatementPeriods } from "./types";

const numberSchema = z.coerce.number();

const incomeStatementSchema = z.object({
  grossSales: numberSchema,
  cardFees: numberSchema,
  orderCount: numberSchema,
  recipeCost: numberSchema,
  stockLosses: numberSchema,
  itemsWithoutCost: numberSchema,
  categories: z.array(
    z.object({
      name: z.string(),
      kind: z.enum(Constants.public.Enums.financial_entry_kind),
      group: z.enum(Constants.public.Enums.dre_group),
      amount: numberSchema,
    }),
  ),
});

async function loadMonth(
  organizationId: OrganizationId,
  monthKey: string,
): Promise<IncomeStatementData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_income_statement", {
    p_organization_id: organizationId,
    p_from: getMonthStart(monthKey),
    p_to: getMonthEnd(monthKey),
  });
  const parsed = incomeStatementSchema.safeParse(data);
  return error || !parsed.success ? null : parsed.data;
}

export async function getIncomeStatement(
  organizationId: OrganizationId,
  monthKey: string,
): Promise<ActionResult<IncomeStatementPeriods>> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;
  if (!isMonthKey(monthKey)) return actionFailure("Mês inválido.");

  await ensureFinanceDefaults(organizationId);
  const previousMonthKey = shiftMonthKey(monthKey, -1);
  const [current, previous] = await Promise.all([
    loadMonth(organizationId, monthKey),
    loadMonth(organizationId, previousMonthKey),
  ]);
  if (!current || !previous) {
    return actionFailure("Não foi possível montar a DRE.");
  }

  return actionSuccess({ monthKey, previousMonthKey, current, previous });
}
