"use server";

import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { getOrderErrorMessage } from "./messages";
import { toOrderPaymentsPayload } from "./order-payments";
import {
  type OrderRequestInput,
  orderCustomerSchema,
  orderRequestSchema,
  type PlaceOrderInput,
  placeOrderSchema,
} from "./schemas";
import type { OrderId, PlacedOrder } from "./types";

export async function placeOrder(
  organizationId: OrganizationId,
  input: PlaceOrderInput,
  request?: OrderRequestInput,
): Promise<ActionResult<PlacedOrder>> {
  const parsedInput = placeOrderSchema.safeParse(input);
  const parsedRequest = orderRequestSchema.optional().safeParse(request);
  if (!parsedInput.success || !parsedRequest.success) {
    return actionFailure("Confira o pedido e tente novamente.");
  }

  const { items, note, payments, customer, sendToKitchen } = parsedInput.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("place_order", {
      p_organization_id: organizationId,
      p_items: items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        note: item.note,
      })),
      p_note: note || undefined,
      p_payments: payments ? toOrderPaymentsPayload(payments) : undefined,
      p_customer_name: customer?.customerName,
      p_is_takeaway: customer?.isTakeaway ?? false,
      p_send_to_kitchen: sendToKitchen,
      p_request_id: parsedRequest.data?.requestId,
      p_placed_at: parsedRequest.data?.placedAt,
    })
    .single();

  if (error) {
    return actionFailure(
      getOrderErrorMessage(error, "Não foi possível registrar o pedido."),
    );
  }

  return actionSuccess({
    id: data.order_id as OrderId,
    number: data.order_number,
    total: data.order_total,
  });
}

export async function isCustomerNameAvailable(
  organizationId: OrganizationId,
  customerName: string,
): Promise<ActionResult<boolean>> {
  const parsedName =
    orderCustomerSchema.shape.customerName.safeParse(customerName);
  if (!parsedName.success) return actionFailure("Informe o nome do cliente.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_customer_name_in_use", {
    p_organization_id: organizationId,
    p_customer_name: parsedName.data,
  });

  if (error) return actionFailure("Não foi possível verificar o nome.");

  return actionSuccess(!data);
}
