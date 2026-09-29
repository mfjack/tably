"use server";

import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { type PlaceOrderInput, placeOrderSchema } from "./schemas";
import type { OrderId, PlacedOrder } from "./types";

const PLACE_ORDER_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  P0002: "Algum produto do pedido não está mais disponível. Atualize a tela.",
  TB001:
    "Estoque insuficiente para algum produto do pedido. Registre a entrada dos insumos e tente de novo.",
  "22023": "Confira o pedido e o valor recebido.",
  "42501": "Você não tem permissão para vender neste estabelecimento.",
};

export async function placeOrder(
  organizationId: OrganizationId,
  input: PlaceOrderInput,
): Promise<ActionResult<PlacedOrder>> {
  const parsedInput = placeOrderSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira o pedido e tente novamente.");
  }

  const { items, note, payment } = parsedInput.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("place_order", {
      p_organization_id: organizationId,
      p_items: items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
      p_note: note || undefined,
      p_payment_method: payment?.method,
      p_amount_received: payment?.amountReceived,
    })
    .single();

  if (error) {
    return actionFailure(
      (error.code && PLACE_ORDER_ERROR_MESSAGES[error.code]) ??
        "Não foi possível registrar o pedido.",
    );
  }

  return actionSuccess({
    id: data.order_id as OrderId,
    number: data.order_number,
    total: data.order_total,
  });
}
