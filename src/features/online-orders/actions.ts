"use server";

import * as z from "zod";
import {
  hasModuleAccess,
  hasModuleAccessToRecord,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrderId } from "@/features/orders/types";
import type { OrganizationId } from "@/features/organizations/types";
import type { ProductId } from "@/features/products/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { getOnlineOrderErrorMessage } from "./messages";
import { type PlaceOnlineOrderInput, placeOnlineOrderSchema } from "./schemas";
import {
  type AcceptedOnlineOrder,
  ONLINE_ORDER_STAGES,
  type OnlineOrderId,
  type OnlineOrderItem,
  type PendingOnlineOrder,
  type PublicOnlineOrder,
} from "./types";

const onlineOrderItemRowSchema = z.object({
  product_id: z.string(),
  name: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  note: z.string().nullable(),
});

const publicOnlineOrderSchema = z.object({
  menuSlug: z.string(),
  menuTitle: z.string(),
  customerName: z.string(),
  note: z.string().nullable(),
  total: z.number(),
  createdAt: z.string(),
  stage: z.enum(ONLINE_ORDER_STAGES),
  items: z.array(onlineOrderItemRowSchema),
});

const onlineOrderIdSchema = z.uuid();

function toOnlineOrderItems(items: unknown): OnlineOrderItem[] {
  const parsedItems = z.array(onlineOrderItemRowSchema).safeParse(items);
  if (!parsedItems.success) return [];

  return parsedItems.data.map((item) => ({
    productId: item.product_id as ProductId,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    note: item.note,
  }));
}

export async function placeOnlineOrder(
  menuSlug: string,
  input: PlaceOnlineOrderInput,
): Promise<ActionResult<OnlineOrderId>> {
  const parsedInput = placeOnlineOrderSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira o pedido e tente de novo.");
  }

  const { onlineOrderId, deviceId, customerName, customerPhone, items } =
    parsedInput.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_online_order", {
    p_slug: menuSlug,
    p_online_order_id: onlineOrderId,
    p_device_id: deviceId,
    p_customer_name: customerName,
    p_items: items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      note: item.note,
    })),
  });

  if (error) {
    return actionFailure(
      getOnlineOrderErrorMessage(error, "Não foi possível enviar o pedido."),
    );
  }

  if (customerPhone) {
    await supabase.rpc("set_online_order_phone", {
      p_online_order_id: onlineOrderId,
      p_device_id: deviceId,
      p_phone: customerPhone,
    });
  }

  return actionSuccess(data as OnlineOrderId);
}

export async function getOnlineOrderStatus(
  onlineOrderId: string,
): Promise<ActionResult<PublicOnlineOrder>> {
  if (!onlineOrderIdSchema.safeParse(onlineOrderId).success) {
    return actionFailure("Pedido não encontrado.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_online_order_status", {
    p_online_order_id: onlineOrderId,
  });
  const parsedOrder = publicOnlineOrderSchema.safeParse(data);

  if (error || !parsedOrder.success) {
    return actionFailure("Pedido não encontrado.");
  }

  return actionSuccess({
    ...parsedOrder.data,
    items: toOnlineOrderItems(parsedOrder.data.items),
  });
}

export async function listPendingOnlineOrders(
  organizationId: OrganizationId,
): Promise<ActionResult<PendingOnlineOrder[]>> {
  if (!(await hasModuleAccess(organizationId, "pos"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("online_orders")
    .select("id, customer_name, note, total, created_at, items")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at");

  if (error) {
    return actionFailure("Não foi possível carregar os pedidos online.");
  }

  return actionSuccess(
    data.map((row) => ({
      id: row.id as OnlineOrderId,
      customerName: row.customer_name,
      note: row.note,
      total: row.total,
      createdAt: row.created_at,
      items: toOnlineOrderItems(row.items),
    })),
  );
}

export async function acceptOnlineOrder(
  onlineOrderId: OnlineOrderId,
): Promise<ActionResult<AcceptedOnlineOrder>> {
  const supabase = await createClient();
  const { data: onlineOrder } = await supabase
    .from("online_orders")
    .select("organization_id")
    .eq("id", onlineOrderId)
    .maybeSingle();
  if (!(await hasModuleAccessToRecord(onlineOrder?.organization_id, "pos"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const { data, error } = await supabase
    .rpc("accept_online_order", { p_online_order_id: onlineOrderId })
    .single();

  if (error) {
    return actionFailure(
      getOnlineOrderErrorMessage(error, "Não foi possível aceitar o pedido."),
    );
  }

  return actionSuccess({
    orderId: data.order_id as OrderId,
    customerName: data.customer_name,
  });
}

export async function rejectOnlineOrder(
  onlineOrderId: OnlineOrderId,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: onlineOrder } = await supabase
    .from("online_orders")
    .select("organization_id")
    .eq("id", onlineOrderId)
    .maybeSingle();
  if (!(await hasModuleAccessToRecord(onlineOrder?.organization_id, "pos"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const { error } = await supabase.rpc("reject_online_order", {
    p_online_order_id: onlineOrderId,
  });

  if (error) {
    return actionFailure(
      getOnlineOrderErrorMessage(error, "Não foi possível recusar o pedido."),
    );
  }

  return actionSuccess();
}
