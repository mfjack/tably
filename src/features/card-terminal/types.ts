import type { Brand } from "@/lib/brand";

export type CardTerminalChargeId = Brand<string, "CardTerminalChargeId">;

export const CARD_TERMINAL_METHODS = [
  "credit_card",
  "debit_card",
  "pix",
] as const;

export type CardTerminalMethod = (typeof CARD_TERMINAL_METHODS)[number];

export type CardTerminalCharge =
  | { status: "pending" }
  | { status: "paid"; method: CardTerminalMethod }
  | { status: "canceled" };
