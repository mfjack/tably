"use server";

import {
  hasModuleAccess,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import {
  type StockCountFormInput,
  type StockCountResult,
  stockCountFormSchema,
} from "./schemas";

export async function applyStockCount(
  organizationId: OrganizationId,
  input: StockCountFormInput,
): Promise<ActionResult<StockCountResult>> {
  if (!(await hasModuleAccess(organizationId, "ingredients"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = stockCountFormSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Conte pelo menos um insumo.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("apply_stock_count", {
      p_organization_id: organizationId,
      p_counts: parsedInput.data.counts.flatMap((count) =>
        count.countedQuantity === undefined
          ? []
          : [
              {
                ingredient_id: count.ingredientId,
                counted_quantity: count.countedQuantity,
              },
            ],
      ),
    })
    .single();

  if (error?.code === "42501") {
    return actionFailure("Só o dono ou o gerente pode salvar a contagem.");
  }
  if (error) return actionFailure("Não foi possível salvar a contagem.");

  return actionSuccess({
    adjustedCount: data.adjusted_count,
    differenceValue: data.difference_value,
  });
}
