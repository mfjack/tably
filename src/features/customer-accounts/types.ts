import type { OrderId, PaymentMethod } from "@/features/orders/types";
import type { Brand } from "@/lib/brand";
import type { Database } from "@/lib/supabase/database.types";

export type CustomerAccountId = Brand<string, "CustomerAccountId">;

export type AccountEntryKind =
  Database["public"]["Enums"]["account_entry_kind"];

export type CustomerAccount = {
  id: CustomerAccountId;
  name: string;
  phone: string | null;
  creditLimit: number | null;
  note: string | null;
  isActive: boolean;
  balance: number;
  lastEntryAt: string | null;
};

export type AccountEntry = {
  id: string;
  kind: AccountEntryKind;
  amount: number;
  orderId: OrderId | null;
  paymentMethod: PaymentMethod | null;
  note: string | null;
  operatorName: string | null;
  createdAt: string;
};
