import type { Brand } from "@/lib/brand";
import type { Database } from "@/lib/supabase/database.types";

export type OrderId = Brand<string, "OrderId">;

export type PaymentMethod = Database["public"]["Enums"]["payment_method"];

export type PlacedOrder = {
  id: OrderId;
  number: number;
  total: number;
};
