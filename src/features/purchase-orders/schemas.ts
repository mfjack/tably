import * as z from "zod";

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().nullable(),
  items: z
    .array(
      z.object({
        ingredientId: z.string().min(1),
        quantity: z.number().positive(),
      }),
    )
    .min(1),
});

export type CreatePurchaseOrderInput = z.infer<
  typeof createPurchaseOrderSchema
>;

export const receivePurchaseOrderFormSchema = z.object({
  items: z.array(
    z.object({
      ingredientId: z.string().min(1),
      quantity: z
        .number({ error: "Informe o que chegou (0 se não veio)." })
        .min(0, "Não pode ser negativo."),
      totalCost: z.number().min(0, "Não pode ser negativo.").optional(),
    }),
  ),
  paymentDueDate: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Data inválida.")
    .optional(),
});

export type ReceivePurchaseOrderFormInput = z.infer<
  typeof receivePurchaseOrderFormSchema
>;

export type ReceivePurchaseOrderInput = {
  items: { ingredientId: string; quantity: number; totalCost: number }[];
  paymentDueDate?: string;
};
