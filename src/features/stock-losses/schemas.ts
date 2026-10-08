import * as z from "zod";
import { STOCK_LOSS_REASONS } from "./labels";

export const stockLossFormSchema = z.object({
  ingredientId: z
    .string({ error: "Escolha o insumo." })
    .min(1, "Escolha o insumo."),
  quantity: z
    .number({ error: "Informe a quantidade." })
    .positive("A quantidade precisa ser maior que zero."),
  reason: z.enum(STOCK_LOSS_REASONS, { error: "Escolha o motivo." }),
  note: z.string().trim().max(200, "Observação muito longa.").optional(),
});

export type StockLossFormInput = z.infer<typeof stockLossFormSchema>;
