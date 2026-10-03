"use server";

import * as z from "zod";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { LOYALTY_PHONE_PATTERN } from "./schemas";
import type { PublicLoyaltyStatus } from "./types";

const publicLoyaltyStatusSchema = z.object({
  first_name: z.string().nullable(),
  balance: z.number(),
  has_stamp_today: z.boolean(),
});

export async function getPublicLoyaltyStatus(
  menuSlug: string,
  phone: string,
): Promise<ActionResult<PublicLoyaltyStatus>> {
  if (!LOYALTY_PHONE_PATTERN.test(phone)) {
    return actionFailure("Informe o celular com DDD.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_loyalty_status", {
    p_slug: menuSlug,
    p_phone: phone,
  });
  const parsedStatus = publicLoyaltyStatusSchema.safeParse(data);

  if (error || !parsedStatus.success) {
    return actionFailure("Não foi possível consultar seus selos.");
  }

  return actionSuccess({
    firstName: parsedStatus.data.first_name,
    balance: parsedStatus.data.balance,
    hasStampToday: parsedStatus.data.has_stamp_today,
  });
}
