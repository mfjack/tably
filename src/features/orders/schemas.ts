import * as z from "zod";
import {
  type OrderAdjustmentsInput,
  orderAdjustmentsSchema,
} from "./order-adjustments";
import { PAYMENT_METHOD_VALUES } from "./payment-methods";

export const ORDER_ITEM_NOTE_MAX_LENGTH = 140;

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  note: z.string().trim().max(ORDER_ITEM_NOTE_MAX_LENGTH).optional(),
});

export const orderPaymentSchema = z.object({
  method: z.enum(PAYMENT_METHOD_VALUES, {
    error: "Escolha a forma de pagamento.",
  }),
  amount: z.number().positive("Informe um valor maior que zero.").optional(),
  amountReceived: z.number().min(0, "Não pode ser negativo.").optional(),
  customerAccountId: z.string().optional(),
});

export const orderCustomerSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Informe o nome do cliente.")
    .max(60, "Nome muito longo."),
  isTakeaway: z.boolean(),
});

export const placeOrderSchema = z
  .object({
    items: z.array(orderItemSchema).min(1, "Adicione produtos ao pedido."),
    note: z.string().trim().max(500, "Observação muito longa.").optional(),
    payments: z.array(orderPaymentSchema).optional(),
    adjustments: orderAdjustmentsSchema.optional(),
    customer: orderCustomerSchema.optional(),
    sendToKitchen: z.boolean(),
  })
  .refine(
    ({ payments, adjustments }) =>
      payments?.length !== 0 || Boolean(adjustments?.loyalty?.rewardProductId),
    { message: "Escolha a forma de pagamento.", path: ["payments"] },
  );

export const payOrderPaymentsSchema = z.array(orderPaymentSchema);

export const orderRequestSchema = z.object({
  requestId: z.uuid(),
  placedAt: z.iso.datetime({ offset: true }).optional(),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type OrderPaymentInput = z.infer<typeof orderPaymentSchema>;
export type OrderCustomerInput = z.infer<typeof orderCustomerSchema>;
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type OrderRequestInput = z.infer<typeof orderRequestSchema>;

export type OrderPaymentConfirmation = {
  payments: OrderPaymentInput[];
  adjustments: OrderAdjustmentsInput;
  total: number;
};

function toCents(value: number) {
  return Math.round(value * 100);
}

export function createPaymentFormSchema(orderTotal: number) {
  return z
    .object({ payments: z.array(orderPaymentSchema).min(1) })
    .superRefine(({ payments }, context) => {
      const isSplit = payments.length > 1;

      payments.forEach((payment, index) => {
        if (
          payment.method === "customer_account" &&
          !payment.customerAccountId
        ) {
          context.addIssue({
            code: "custom",
            message: "Escolha a conta do cliente.",
            path: ["payments", index, "customerAccountId"],
          });
        }

        if (isSplit && payment.amount === undefined) {
          context.addIssue({
            code: "custom",
            message: "Informe o valor.",
            path: ["payments", index, "amount"],
          });
        }

        if (payment.method !== "cash") return;

        const amountDue = isSplit ? (payment.amount ?? 0) : orderTotal;

        if (!isSplit && payment.amountReceived === undefined) {
          context.addIssue({
            code: "custom",
            message: "Informe o valor recebido.",
            path: ["payments", index, "amountReceived"],
          });
          return;
        }

        if (
          payment.amountReceived !== undefined &&
          payment.amountReceived < amountDue
        ) {
          context.addIssue({
            code: "custom",
            message: isSplit
              ? "O valor recebido é menor que o valor em dinheiro."
              : "O valor recebido é menor que o total.",
            path: ["payments", index, "amountReceived"],
          });
        }
      });

      if (!isSplit) return;

      const paidCents = payments.reduce(
        (total, payment) => total + toCents(payment.amount ?? 0),
        0,
      );

      if (paidCents !== toCents(orderTotal)) {
        context.addIssue({
          code: "custom",
          message: "A soma dos pagamentos precisa fechar o total.",
          path: ["payments"],
        });
      }
    });
}

export type PaymentFormInput = z.infer<
  ReturnType<typeof createPaymentFormSchema>
>;
