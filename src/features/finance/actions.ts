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
  ENTRY_COLUMNS,
  MONTH_ENTRIES_LIMIT,
  toFinancialEntry,
} from "./entry-mapping";
import {
  ACCESS_DENIED,
  canUseFinance,
  ensureFinanceDefaults,
  syncRecurrences,
} from "./finance-core";
import type {
  FinancialAccountId,
  FinancialEntry,
  FinancialOverview,
} from "./types";

const overviewSchema = z.object({
  today: z.string(),
  accounts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      kind: z.enum(["cash", "bank", "card_acquirer", "digital_wallet"]),
      isArchived: z.boolean(),
      balance: z.number(),
    }),
  ),
  firstMonthKey: z.string(),
  periodIncome: z.number(),
  periodSales: z.number(),
  salesBalance: z.number(),
  periodExpense: z.number(),
  overduePayables: z.object({ count: z.number(), amount: z.number() }),
  monthPayables: z.object({ count: z.number(), amount: z.number() }),
  overdueReceivables: z.object({ count: z.number(), amount: z.number() }),
  monthReceivables: z.object({ count: z.number(), amount: z.number() }),
  monthFixedExpenses: z.object({
    count: z.number(),
    amount: z.number(),
    paidAmount: z.number(),
    openCount: z.number(),
  }),
});

export async function getFinancialOverview(
  organizationId: OrganizationId,
  monthKey: string,
): Promise<
  ActionResult<FinancialOverview & { monthEntries: FinancialEntry[] }>
> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;
  if (!isMonthKey(monthKey)) return actionFailure("Mês inválido.");

  const clock = await getOrganizationClock(organizationId);
  if (!clock) return actionFailure("Não foi possível carregar o financeiro.");

  await ensureFinanceDefaults(organizationId);
  const monthStart = getMonthStart(monthKey);
  const monthEnd = getMonthEnd(monthKey);
  await syncRecurrences(organizationId, clock.today, monthEnd);

  const supabase = await createClient();
  const [overviewResult, monthEntriesResult] = await Promise.all([
    supabase.rpc("get_financial_overview", {
      p_organization_id: organizationId,
      p_from: monthStart,
      p_to: monthEnd,
    }),
    supabase
      .from("financial_entries")
      .select(ENTRY_COLUMNS)
      .eq("organization_id", organizationId)
      .gte("due_date", monthStart)
      .lte("due_date", monthEnd)
      .order("due_date")
      .order("created_at")
      .limit(MONTH_ENTRIES_LIMIT),
  ]);

  const parsedOverview = overviewSchema.safeParse(overviewResult.data);
  if (
    overviewResult.error ||
    monthEntriesResult.error ||
    !parsedOverview.success
  ) {
    return actionFailure("Não foi possível carregar o financeiro.");
  }

  const overview = parsedOverview.data;
  return actionSuccess({
    ...overview,
    accounts: overview.accounts.map((account) => ({
      ...account,
      id: account.id as FinancialAccountId,
    })),
    monthEntries: monthEntriesResult.data.map(toFinancialEntry),
  });
}
