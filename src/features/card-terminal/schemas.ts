import * as z from "zod";
import { CARD_TERMINAL_METHODS } from "./types";

export const startCardTerminalChargeSchema = z.object({
  amount: z.number().positive().max(1_000_000),
  method: z.enum(CARD_TERMINAL_METHODS),
});

export type StartCardTerminalChargeInput = z.infer<
  typeof startCardTerminalChargeSchema
>;

export const CIELO_MERCHANT_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

export const cardTerminalSettingsSchema = z.object({
  cieloMerchantId: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || CIELO_MERCHANT_ID_PATTERN.test(value),
      "Use só letras, números e hífen.",
    ),
});

export type CardTerminalSettingsInput = z.infer<
  typeof cardTerminalSettingsSchema
>;
