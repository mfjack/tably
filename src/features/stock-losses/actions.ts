"use server";

import type { IngredientId } from "@/features/ingredients/types";
import {
  hasModuleAccess,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrganizationId } from "@/features/organizations/types";
import {
  getMonthEnd,
  getMonthStart,
  isMonthKey,
} from "@/features/time-clock/time-utils";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { STOCK_LOSS_REASONS } from "./labels";
import { type StockLossFormInput, stockLossFormSchema } from "./schemas";
import type {
  StockLoss,
  StockLossesMonth,
  StockLossId,
  StockLossReason,
} from "./types";

const MONTH_LOSSES_LIMIT = 500;

export async function listStockLosses(
  organizationId: OrganizationId,
  monthKey: string,
): Promise<ActionResult<StockLossesMonth>> {
  if (!(await hasModuleAccess(organizationId, "ingredients"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  if (!isMonthKey(monthKey)) return actionFailure("Mês inválido.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_losses")
    .select(
      "id, ingredient_id, quantity, reason, note, unit_cost, loss_date, created_by_name, created_at, ingredient:ingredients(name, unit)",
    )
    .eq("organization_id", organizationId)
    .gte("loss_date", getMonthStart(monthKey))
    .lte("loss_date", getMonthEnd(monthKey))
    .order("created_at", { ascending: false })
    .limit(MONTH_LOSSES_LIMIT);

  if (error) return actionFailure("Não foi possível carregar as perdas.");

  const losses: StockLoss[] = data.flatMap((loss) =>
    loss.ingredient
      ? [
          {
            id: loss.id as StockLossId,
            ingredientId: loss.ingredient_id as IngredientId,
            ingredientName: loss.ingredient.name,
            unit: loss.ingredient.unit,
            quantity: loss.quantity,
            reason: loss.reason,
            note: loss.note,
            value: loss.quantity * loss.unit_cost,
            lossDate: loss.loss_date,
            createdByName: loss.created_by_name,
          },
        ]
      : [],
  );
  const valueByReason = Object.fromEntries(
    STOCK_LOSS_REASONS.map((reason) => [reason, 0]),
  ) as Record<StockLossReason, number>;
  for (const loss of losses) valueByReason[loss.reason] += loss.value;

  return actionSuccess({
    monthKey,
    losses,
    totalValue: losses.reduce((total, loss) => total + loss.value, 0),
    valueByReason,
  });
}

export async function registerStockLoss(
  organizationId: OrganizationId,
  input: StockLossFormInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "ingredients"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = stockLossFormSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const { ingredientId, quantity, reason, note } = parsedInput.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("register_stock_loss", {
    p_organization_id: organizationId,
    p_ingredient_id: ingredientId,
    p_quantity: quantity,
    p_reason: reason,
    p_note: note || undefined,
  });

  if (error?.code === "P0002") {
    return actionFailure("Esse insumo não existe mais. Atualize a tela.");
  }
  if (error) return actionFailure("Não foi possível registrar a perda.");

  return actionSuccess();
}
