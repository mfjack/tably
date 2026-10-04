import type { PaymentMethod } from "@/features/orders/types";
import type { Brand } from "@/lib/brand";
import type { Database } from "@/lib/supabase/database.types";

export type CashSessionId = Brand<string, "CashSessionId">;

export type CashMovementKind =
  Database["public"]["Enums"]["cash_movement_kind"];

export type CashMovement = {
  id: string;
  kind: CashMovementKind;
  amount: number;
  note: string | null;
  createdAt: string;
  createdByName: string | null;
};

export type CashPaymentTotal = {
  method: PaymentMethod;
  amount: number;
  surcharge: number;
  fee: number;
};

export type CashSessionSummary = {
  id: CashSessionId;
  openedAt: string;
  openedByName: string | null;
  openingAmount: number;
  closedAt: string | null;
  closedByName: string | null;
  countedCash: number | null;
  closingNote: string | null;
  orderCount: number;
  receivedTotal: number;
  supplies: number;
  withdrawals: number;
  expectedCash: number;
  payments: CashPaymentTotal[];
  movements: CashMovement[];
};
