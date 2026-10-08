import * as z from "zod";

export const stockCountFormSchema = z.object({
  counts: z
    .array(
      z.object({
        ingredientId: z.string().min(1),
        countedQuantity: z.number().min(0, "Não pode ser negativo.").optional(),
      }),
    )
    .refine(
      (counts) => counts.some((count) => count.countedQuantity !== undefined),
      {
        message: "Conte pelo menos um insumo.",
      },
    ),
});

export type StockCountFormInput = z.infer<typeof stockCountFormSchema>;

export type StockCountResult = {
  adjustedCount: number;
  differenceValue: number;
};
