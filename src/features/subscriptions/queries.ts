import "server-only";

import { createClient } from "@/lib/supabase/server";
import { type PlanSelection, parsePlanSelection } from "./plans";

export async function getSignUpPlanSelection(): Promise<PlanSelection | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const metadata = data?.claims.user_metadata;
  return parsePlanSelection(
    metadata?.selected_plan,
    metadata?.selected_billing_cycle,
  );
}
