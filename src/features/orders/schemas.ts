import { z } from "zod";
import { PAYMENT_METHOD_VALUES } from "./payment-methods";

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const orderPaymentSchema = z.object({
  method: z.enum(PAYMENT_METHOD_VALUES, {
    error: "Escolha a forma de pagamento.",
  }),
  amountReceived: z.number().min(0, "Não pode ser negativo.").optional(),
});

export const placeOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "Adicione produtos ao pedido."),
  note: z.string().trim().max(500, "Observação muito longa.").optional(),
  payment: orderPaymentSchema.optional(),
});

export type OrderPaymentInput = z.infer<typeof orderPaymentSchema>;
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export function createQuickPaymentSchema(orderTotal: number) {
  return orderPaymentSchema.superRefine((payment, context) => {
    if (payment.method !== "cash") return;

    if (payment.amountReceived === undefined) {
      context.addIssue({
        code: "custom",
        message: "Informe o valor recebido.",
        path: ["amountReceived"],
      });
      return;
    }

    if (payment.amountReceived < orderTotal) {
      context.addIssue({
        code: "custom",
        message: "O valor recebido é menor que o total.",
        path: ["amountReceived"],
      });
    }
  });
}
