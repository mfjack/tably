import * as z from "zod";
import { PURCHASABLE_ITEM_KINDS } from "./types";

const purchasableItemKindSchema = z.enum(PURCHASABLE_ITEM_KINDS);

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().nullable(),
  items: z
    .array(
      z
        .object({
          kind: purchasableItemKindSchema,
          id: z.string().min(1),
          quantity: z.number().positive(),
        })
        .refine(
          (item) => item.kind !== "product" || Number.isInteger(item.quantity),
          "Use um número inteiro.",
        ),
    )
    .min(1),
});

export type CreatePurchaseOrderInput = z.infer<
  typeof createPurchaseOrderSchema
>;

export const receivePurchaseOrderFormSchema = z.object({
  items: z.array(
    z
      .object({
        kind: purchasableItemKindSchema,
        quantity: z
          .number({ error: "Informe o que chegou (0 se não veio)." })
          .min(0, "Não pode ser negativo."),
        totalCost: z.number().min(0, "Não pode ser negativo.").optional(),
      })
      .superRefine((item, context) => {
        if (item.kind !== "product") return;
        if (!Number.isInteger(item.quantity)) {
          context.addIssue({
            code: "custom",
            path: ["quantity"],
            message: "Use um número inteiro.",
          });
        }
        if (item.quantity > 0 && !item.totalCost) {
          context.addIssue({
            code: "custom",
            path: ["totalCost"],
            message: "Informe o valor pago.",
          });
        }
      }),
  ),
  paymentDueDate: z
    .string({ error: "Informe a data de pagamento." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de pagamento."),
});

export type ReceivePurchaseOrderFormInput = z.infer<
  typeof receivePurchaseOrderFormSchema
>;

export type ReceivePurchaseOrderInput = {
  items: {
    kind: z.infer<typeof purchasableItemKindSchema>;
    id: string;
    quantity: number;
    totalCost: number;
  }[];
  paymentDueDate?: string;
};
