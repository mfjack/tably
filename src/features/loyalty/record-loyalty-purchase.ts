import "server-only";

import type { OrderId } from "@/features/orders/types";
import { createClient } from "@/lib/supabase/server";
import { type LoyaltyCheckoutInput, loyaltyCheckoutSchema } from "./schemas";

export async function findOnlineOrderLoyalty(
  orderId: OrderId,
): Promise<LoyaltyCheckoutInput | undefined> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("online_orders")
    .select("customer_phone, customer_name")
    .eq("order_id", orderId)
    .not("customer_phone", "is", null)
    .limit(1)
    .maybeSingle();

  return data?.customer_phone
    ? { phone: data.customer_phone, name: data.customer_name }
    : undefined;
}

export async function recordLoyaltyPurchase(
  orderId: OrderId,
  input: LoyaltyCheckoutInput | undefined,
): Promise<boolean> {
  if (!input) return true;
  const parsedInput = loyaltyCheckoutSchema.safeParse(input);
  if (!parsedInput.success) return false;

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_loyalty_purchase", {
    p_order_id: orderId,
    p_phone: parsedInput.data.phone,
    p_name: parsedInput.data.name || undefined,
  });
  return !error;
}
