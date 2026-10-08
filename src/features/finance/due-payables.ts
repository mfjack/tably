import "server-only";

import { addDays, format, parseISO } from "date-fns";
import type { OrganizationId } from "@/features/organizations/types";
import { createClient } from "@/lib/supabase/server";

export type DuePayablesSummary = {
  today: string;
  overdueCount: number;
  dueTodayCount: number;
  dueTomorrowCount: number;
  totalAmount: number;
};

export async function getDuePayablesSummary(
  organizationId: OrganizationId,
): Promise<DuePayablesSummary | null> {
  const supabase = await createClient();
  const { data: today, error: todayError } = await supabase.rpc(
    "organization_today",
    { p_organization_id: organizationId },
  );
  if (todayError || !today) return null;

  const tomorrow = format(addDays(parseISO(today), 1), "yyyy-MM-dd");
  const { data, error } = await supabase
    .from("financial_entries")
    .select("due_date, amount")
    .eq("organization_id", organizationId)
    .eq("kind", "expense")
    .is("paid_at", null)
    .lte("due_date", tomorrow);
  if (error) return null;

  return {
    today,
    overdueCount: data.filter((entry) => entry.due_date < today).length,
    dueTodayCount: data.filter((entry) => entry.due_date === today).length,
    dueTomorrowCount: data.filter((entry) => entry.due_date === tomorrow)
      .length,
    totalAmount: data.reduce((total, entry) => total + entry.amount, 0),
  };
}
