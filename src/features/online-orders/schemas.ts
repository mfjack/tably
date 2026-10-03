import * as z from "zod";
import { LOYALTY_PHONE_PATTERN } from "@/features/loyalty/schemas";
import { CART_ITEM_NOTE_MAX_LENGTH } from "@/features/pos/cart-items";

export const ONLINE_ORDER_MAX_ITEM_QUANTITY = 50;

export const onlineOrderItemsSchema = z
  .array(
    z.object({
      productId: z.uuid(),
      quantity: z.number().int().positive().max(ONLINE_ORDER_MAX_ITEM_QUANTITY),
      note: z.string().trim().max(CART_ITEM_NOTE_MAX_LENGTH),
    }),
  )
  .min(1, "Adicione pelo menos um item.")
  .max(30, "Pedido muito grande.");

export const onlineOrderCustomerSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Informe seu nome.")
    .max(60, "Nome muito longo."),
  customerPhone: z
    .string()
    .refine(
      (phone) => phone === "" || LOYALTY_PHONE_PATTERN.test(phone),
      "Informe o celular com DDD.",
    ),
});

export const placeOnlineOrderSchema = onlineOrderCustomerSchema.extend({
  onlineOrderId: z.uuid(),
  deviceId: z.uuid(),
  items: onlineOrderItemsSchema,
});

export type OnlineOrderCustomerInput = z.infer<
  typeof onlineOrderCustomerSchema
>;
export type PlaceOnlineOrderInput = z.infer<typeof placeOnlineOrderSchema>;
