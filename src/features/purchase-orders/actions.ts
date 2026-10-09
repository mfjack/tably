"use server";

import type { IngredientId } from "@/features/ingredients/types";
import {
  hasModuleAccess,
  hasModuleAccessToRecord,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrganizationId } from "@/features/organizations/types";
import type { SupplierId } from "@/features/suppliers/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import {
  type CreatePurchaseOrderInput,
  createPurchaseOrderSchema,
  type ReceivePurchaseOrderInput,
} from "./schemas";
import type { PurchaseOrder, PurchaseOrderId } from "./types";

const PENDING_ORDERS_LIMIT = 100;

export async function listPendingPurchaseOrders(
  organizationId: OrganizationId,
): Promise<ActionResult<PurchaseOrder[]>> {
  if (!(await hasModuleAccess(organizationId, "ingredients"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(
      "id, supplier_id, created_at, created_by_name, supplier:suppliers(name), purchase_order_items(ingredient_id, quantity, ingredient:ingredients(name, unit, unit_cost, package_name, package_size))",
    )
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(PENDING_ORDERS_LIMIT);

  if (error)
    return databaseFailure("Não foi possível carregar os pedidos.", error);

  return actionSuccess(
    data.map((order) => ({
      id: order.id as PurchaseOrderId,
      supplierId: order.supplier_id as SupplierId | null,
      supplierName: order.supplier?.name ?? null,
      createdAt: order.created_at,
      createdByName: order.created_by_name,
      items: order.purchase_order_items
        .flatMap((item) =>
          item.ingredient
            ? [
                {
                  ingredientId: item.ingredient_id as IngredientId,
                  ingredientName: item.ingredient.name,
                  unit: item.ingredient.unit,
                  quantity: item.quantity,
                  unitCost: item.ingredient.unit_cost,
                  packageName: item.ingredient.package_name,
                  packageSize: item.ingredient.package_size,
                },
              ]
            : [],
        )
        .sort((first, second) =>
          first.ingredientName.localeCompare(second.ingredientName, "pt-BR"),
        ),
    })),
  );
}

export async function createPurchaseOrder(
  organizationId: OrganizationId,
  input: CreatePurchaseOrderInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "ingredients"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = createPurchaseOrderSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Informe a quantidade de pelo menos um insumo.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_purchase_order", {
    p_organization_id: organizationId,
    p_items: parsedInput.data.items.map((item) => ({
      ingredient_id: item.ingredientId,
      quantity: item.quantity,
    })),
    p_supplier_id: parsedInput.data.supplierId ?? undefined,
  });

  if (error) return databaseFailure("Não foi possível salvar o pedido.", error);

  return actionSuccess();
}

async function getOrderOrganizationId(orderId: PurchaseOrderId) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchase_orders")
    .select("organization_id")
    .eq("id", orderId)
    .maybeSingle();
  return data?.organization_id;
}

export async function receivePurchaseOrder(
  orderId: PurchaseOrderId,
  input: ReceivePurchaseOrderInput,
): Promise<ActionResult> {
  if (
    !(await hasModuleAccessToRecord(
      await getOrderOrganizationId(orderId),
      "ingredients",
    ))
  ) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  if (input.items.every((item) => item.quantity <= 0)) {
    return actionFailure("Informe o que chegou de pelo menos um insumo.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("receive_purchase_order", {
    p_order_id: orderId,
    p_items: input.items.map((item) => ({
      ingredient_id: item.ingredientId,
      quantity: item.quantity,
      total_cost: item.totalCost,
    })),
    p_payment_due_date: input.paymentDueDate || undefined,
  });

  if (error?.code === "42501") {
    return actionFailure("Só o dono ou o gerente pode receber pedidos.");
  }
  if (error?.code === "TB034") {
    return actionFailure("Esse pedido já foi recebido ou cancelado.");
  }
  if (error)
    return databaseFailure("Não foi possível receber o pedido.", error);

  return actionSuccess();
}

export async function cancelPurchaseOrder(
  orderId: PurchaseOrderId,
): Promise<ActionResult> {
  if (
    !(await hasModuleAccessToRecord(
      await getOrderOrganizationId(orderId),
      "ingredients",
    ))
  ) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_purchase_order", {
    p_order_id: orderId,
  });

  if (error)
    return databaseFailure("Não foi possível cancelar o pedido.", error);

  return actionSuccess();
}
