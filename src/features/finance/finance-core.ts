import "server-only";

import { addDays, format, parseISO } from "date-fns";
import {
  hasModuleAccess,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrganizationId } from "@/features/organizations/types";
import { actionFailure } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CATEGORIES } from "./labels";
import type { FinancialAccountId } from "./types";

const SYNC_HORIZON_IN_DAYS = 90;
export const ACCESS_DENIED = actionFailure(MODULE_ACCESS_DENIED_MESSAGE);

export async function canUseFinance(organizationId: OrganizationId) {
  return hasModuleAccess(organizationId, "finance");
}

export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export async function syncRecurrences(
  organizationId: OrganizationId,
  today: string,
  coverUntil?: string,
) {
  const horizon = toDateKey(addDays(parseISO(today), SYNC_HORIZON_IN_DAYS));
  const supabase = await createClient();
  await supabase.rpc("sync_financial_recurrences", {
    p_organization_id: organizationId,
    p_until: coverUntil && coverUntil > horizon ? coverUntil : horizon,
  });
}

export async function getDefaultAccountId(
  organizationId: OrganizationId,
): Promise<FinancialAccountId | null> {
  await ensureFinanceDefaults(organizationId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("financial_accounts")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_archived", false)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return (data?.id ?? null) as FinancialAccountId | null;
}

export async function ensureFinanceDefaults(organizationId: OrganizationId) {
  const supabase = await createClient();
  const [categoriesResult, accountsResult] = await Promise.all([
    supabase
      .from("financial_categories")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("financial_accounts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);

  if (categoriesResult.count === 0) {
    await supabase.from("financial_categories").insert(
      (["expense", "income"] as const).flatMap((kind) =>
        DEFAULT_CATEGORIES[kind].map((name) => ({
          organization_id: organizationId,
          kind,
          name,
        })),
      ),
    );
  }

  if (accountsResult.count === 0) {
    await supabase.from("financial_accounts").insert({
      organization_id: organizationId,
      name: "Caixa",
      kind: "cash",
    });
  }
}
