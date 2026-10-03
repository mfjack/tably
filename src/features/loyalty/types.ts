import type { Brand } from "@/lib/brand";
import type { Database } from "@/lib/supabase/database.types";

export type LoyaltyCustomerId = Brand<string, "LoyaltyCustomerId">;

export type LoyaltyTransactionKind =
  Database["public"]["Enums"]["loyalty_transaction_kind"];

export type LoyaltySettings = {
  isEnabled: boolean;
  stampsRequired: number;
  minimumPurchase: number;
  rewardDescription: string;
};

export type LoyaltyProgram = Omit<LoyaltySettings, "isEnabled">;

export type LoyaltyCustomer = {
  id: LoyaltyCustomerId;
  name: string;
  phone: string;
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  lastVisitAt: string | null;
};

export type LoyaltyCustomerLookup = Pick<
  LoyaltyCustomer,
  "id" | "name" | "phone" | "balance"
> & {
  hasStampToday: boolean;
};

export type LoyaltyTransaction = {
  id: string;
  kind: LoyaltyTransactionKind;
  stamps: number;
  note: string | null;
  createdByName: string | null;
  createdAt: string;
};

export type PublicLoyaltyStatus = {
  firstName: string | null;
  balance: number;
  hasStampToday: boolean;
};
