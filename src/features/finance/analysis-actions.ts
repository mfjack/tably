"use server";

import * as z from "zod";
import type { OrganizationId } from "@/features/organizations/types";
import { getOrganizationClock } from "@/features/time-clock/load-timesheet";
import {
  getMonthEnd,
  getMonthStart,
  isMonthKey,
} from "@/features/time-clock/time-utils";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import {
  type FinancialAnalysisData,
  PROJECTION_HORIZONS,
  type ProjectionHorizon,
} from "./analysis";
import {
  ACCESS_DENIED,
  canUseFinance,
  ensureFinanceDefaults,
  syncRecurrences,
} from "./finance-core";

const numberSchema = z.coerce.number();

const analysisSchema = z.object({
  today: z.string(),
  balanceToday: numberSchema,
  overdue: z.object({ income: numberSchema, expense: numberSchema }),
  scheduled: z.array(
    z.object({
      date: z.string(),
      income: numberSchema,
      expense: numberSchema,
    }),
  ),
});

export async function getFinancialAnalysis(
  organizationId: OrganizationId,
  monthKey: string,
  horizonDays: ProjectionHorizon,
): Promise<ActionResult<FinancialAnalysisData>> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;
  if (!isMonthKey(monthKey)) return actionFailure("Mês inválido.");
  if (!PROJECTION_HORIZONS.includes(horizonDays)) {
    return actionFailure("Período inválido.");
  }

  const clock = await getOrganizationClock(organizationId);
  if (!clock) return actionFailure("Não foi possível carregar as análises.");

  await ensureFinanceDefaults(organizationId);
  await syncRecurrences(organizationId, clock.today);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_financial_analysis", {
    p_organization_id: organizationId,
    p_from: getMonthStart(monthKey),
    p_to: getMonthEnd(monthKey),
    p_horizon_days: horizonDays,
  });

  const parsedAnalysis = analysisSchema.safeParse(data);
  if (error || !parsedAnalysis.success) {
    return actionFailure("Não foi possível carregar as análises.");
  }
  return actionSuccess(parsedAnalysis.data);
}
