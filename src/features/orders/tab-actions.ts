"use server";

import {
  findOnlineOrderLoyalty,
  recordLoyaltyPurchase,
} from "@/features/loyalty/record-loyalty-purchase";
import {
  hasAnyModuleAccess,
  hasModuleAccess,
  hasModuleAccessToRecord,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrganizationId } from "@/features/organizations/types";
import {
  getAddonsTotal,
  parseOrderItemAddons,
} from "@/features/product-addons/item-addons";
import type { ProductId } from "@/features/products/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { getOrderErrorMessage } from "./messages";
import {
  hasLoyaltyReward,
  type OrderAdjustmentsInput,
  orderAdjustmentsSchema,
  toOrderAdjustmentsPayload,
} from "./order-adjustments";
import { toOrderPaymentsPayload } from "./order-payments";
import {
  type OrderItemInput,
  type OrderPaymentInput,
  type OrderRequestInput,
  orderItemSchema,
  orderRequestSchema,
  payOrderPaymentsSchema,
} from "./schemas";
import type {
  OrderDetails,
  OrderId,
  OrderItemId,
  PaymentMethod,
} from "./types";

const ORDER_DETAILS_COLUMNS = `
  id, customer_name, is_takeaway, note, subtotal, takeaway_fee,
  service_fee_amount, discount_amount, loyalty_reward_amount, total,
  created_at, paid_at,
  created_by_operator_name, paid_by_operator_name,
  attendant:profiles!orders_created_by_profile_fkey(full_name),
  cashier:profiles!orders_paid_by_profile_fkey(full_name),
  order_items(
    id, product_id, product_name, quantity, unit_price, note, addons,
    product:products!order_items_product_id_organization_id_fkey(
      category:categories!products_category_id_organization_id_fkey(created_at, position)
    )
  ),
  order_payments(method, amount, amount_received, surcharge),
  online_orders(id)
`;

const PAID_ORDERS_LIMIT = 200;

type OrderDetailsRow = {
  id: string;
  customer_name: string | null;
  is_takeaway: boolean;
  note: string | null;
  subtotal: number;
  takeaway_fee: number;
  service_fee_amount: number;
  discount_amount: number;
  loyalty_reward_amount: number;
  total: number;
  created_at: string;
  paid_at: string | null;
  created_by_operator_name: string | null;
  paid_by_operator_name: string | null;
  attendant: { full_name: string | null } | null;
  cashier: { full_name: string | null } | null;
  order_items: Array<{
    id: string;
    product_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
    note: string | null;
    addons: unknown;
    product: {
      category: { created_at: string; position: number } | null;
    } | null;
  }>;
  order_payments: Array<{
    method: PaymentMethod;
    amount: number;
    amount_received: number | null;
    surcharge: number;
  }>;
  online_orders: Array<{ id: string }>;
};

type OrderDetailsItemRow = OrderDetailsRow["order_items"][number];

function getCategorySortKey(item: OrderDetailsItemRow): string | null {
  const category = item.product?.category;
  if (!category) return null;
  return `${category.created_at}|${category.position.toString().padStart(6, "0")}`;
}

function compareCategoryKeys(first: string | null, second: string | null) {
  if (first === second) return 0;
  if (first === null) return 1;
  if (second === null) return -1;
  return first < second ? -1 : 1;
}

function compareOrderItemsByCategory(
  first: OrderDetailsItemRow,
  second: OrderDetailsItemRow,
): number {
  return (
    compareCategoryKeys(
      getCategorySortKey(first),
      getCategorySortKey(second),
    ) || first.product_name.localeCompare(second.product_name, "pt-BR")
  );
}

function toOrderDetails(row: OrderDetailsRow): OrderDetails {
  return {
    id: row.id as OrderId,
    customerName: row.customer_name,
    isTakeaway: row.is_takeaway,
    note: row.note,
    subtotal: row.subtotal,
    takeawayFee: row.takeaway_fee,
    serviceFee: row.service_fee_amount,
    discount: row.discount_amount,
    loyaltyReward: row.loyalty_reward_amount,
    total: row.total,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    isFromMenu: row.online_orders.length > 0,
    payments: row.order_payments
      .map((payment) => ({
        method: payment.method,
        amount: payment.amount,
        amountReceived: payment.amount_received,
        surcharge: payment.surcharge,
      }))
      .sort((first, second) => second.amount - first.amount),
    attendantName:
      row.created_by_operator_name ?? row.attendant?.full_name ?? null,
    cashierName: row.paid_by_operator_name ?? row.cashier?.full_name ?? null,
    items: [...row.order_items]
      .sort(compareOrderItemsByCategory)
      .map((item) => {
        const addons = parseOrderItemAddons(item.addons);
        return {
          id: item.id as OrderItemId,
          productId: item.product_id as ProductId | null,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          basePrice: item.unit_price - getAddonsTotal(addons),
          addonNames: addons.map((addon) => addon.name),
          note: item.note,
          total: item.unit_price * item.quantity,
        };
      }),
  };
}

export async function listOpenOrderTabs(
  organizationId: OrganizationId,
): Promise<ActionResult<OrderDetails[]>> {
  if (!(await hasAnyModuleAccess(organizationId, ["pos", "order_tabs"]))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_DETAILS_COLUMNS)
    .eq("organization_id", organizationId)
    .is("paid_at", null)
    .neq("status", "canceled")
    .not("customer_name", "is", null)
    .order("created_at", { ascending: false })
    .overrideTypes<OrderDetailsRow[], { merge: false }>();

  if (error)
    return databaseFailure("Não foi possível carregar as comandas.", error);

  return actionSuccess(data.map(toOrderDetails));
}

export async function listPaidOrders(
  organizationId: OrganizationId,
): Promise<ActionResult<OrderDetails[]>> {
  if (!(await hasModuleAccess(organizationId, "order_tabs"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_DETAILS_COLUMNS)
    .eq("organization_id", organizationId)
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: false })
    .limit(PAID_ORDERS_LIMIT)
    .overrideTypes<OrderDetailsRow[], { merge: false }>();

  if (error)
    return databaseFailure("Não foi possível carregar o histórico.", error);

  return actionSuccess(data.map(toOrderDetails));
}

export async function addOrderItems(
  orderId: OrderId,
  items: OrderItemInput[],
  note?: string,
  request?: OrderRequestInput,
): Promise<ActionResult> {
  const parsedItems = orderItemSchema.array().min(1).safeParse(items);
  if (!parsedItems.success)
    return actionFailure("Adicione produtos à comanda.");

  const parsedRequest = orderRequestSchema.optional().safeParse(request);
  if (!parsedRequest.success)
    return actionFailure("Confira o pedido e tente novamente.");

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("organization_id")
    .eq("id", orderId)
    .maybeSingle();
  if (
    !(await hasModuleAccessToRecord(order?.organization_id, [
      "pos",
      "order_tabs",
    ]))
  ) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const { error } = await supabase.rpc("add_order_items", {
    p_order_id: orderId,
    p_items: parsedItems.data.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      note: item.note,
      addon_ids: item.addonIds ?? [],
    })),
    p_note: note?.trim().slice(0, 500),
    p_request_id: parsedRequest.data?.requestId,
    p_placed_at: parsedRequest.data?.placedAt,
  });

  if (error) {
    return actionFailure(
      getOrderErrorMessage(error, "Não foi possível adicionar os produtos."),
    );
  }
  return actionSuccess();
}

export async function removeOrderItem(
  orderItemId: OrderItemId,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: orderItem } = await supabase
    .from("order_items")
    .select("organization_id")
    .eq("id", orderItemId)
    .maybeSingle();
  if (
    !(await hasModuleAccessToRecord(orderItem?.organization_id, "order_tabs"))
  ) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const { error } = await supabase.rpc("remove_order_item", {
    p_order_item_id: orderItemId,
  });

  if (error) {
    return actionFailure(
      getOrderErrorMessage(error, "Não foi possível remover o item."),
    );
  }
  return actionSuccess();
}

export async function payOrder(
  orderId: OrderId,
  payments: OrderPaymentInput[],
  adjustments: OrderAdjustmentsInput,
): Promise<ActionResult> {
  const parsedPayments = payOrderPaymentsSchema.safeParse(payments);
  const parsedAdjustments = orderAdjustmentsSchema.safeParse(adjustments);
  if (
    !parsedPayments.success ||
    !parsedAdjustments.success ||
    (parsedPayments.data.length === 0 &&
      !hasLoyaltyReward(parsedAdjustments.data))
  ) {
    return actionFailure("Escolha a forma de pagamento.");
  }

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("organization_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!(await hasModuleAccessToRecord(order?.organization_id, "order_tabs"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const { error } = await supabase.rpc("pay_order", {
    p_order_id: orderId,
    p_payments:
      parsedPayments.data.length > 0
        ? toOrderPaymentsPayload(parsedPayments.data)
        : undefined,
    ...toOrderAdjustmentsPayload(parsedAdjustments.data),
  });

  if (error) {
    return actionFailure(
      getOrderErrorMessage(error, "Não foi possível registrar o pagamento."),
    );
  }

  await recordLoyaltyPurchase(
    orderId,
    parsedAdjustments.data.loyalty ?? (await findOnlineOrderLoyalty(orderId)),
  );
  return actionSuccess();
}

export async function cancelOrder(orderId: OrderId): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("organization_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!(await hasModuleAccessToRecord(order?.organization_id, "order_tabs"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const { error } = await supabase.rpc("cancel_order", {
    p_order_id: orderId,
  });

  if (error) {
    return actionFailure(
      getOrderErrorMessage(error, "Não foi possível cancelar a comanda."),
    );
  }
  return actionSuccess();
}
