import type { IngredientId, MeasureUnit } from "@/features/ingredients/types";
import type { Brand } from "@/lib/brand";
import type { Database } from "@/lib/supabase/database.types";

export type StockLossId = Brand<string, "StockLossId">;

export type StockLossReason = Database["public"]["Enums"]["stock_loss_reason"];

export type StockLoss = {
  id: StockLossId;
  ingredientId: IngredientId;
  ingredientName: string;
  unit: MeasureUnit;
  quantity: number;
  reason: StockLossReason;
  note: string | null;
  value: number;
  lossDate: string;
  createdByName: string | null;
};

export type StockLossesMonth = {
  monthKey: string;
  losses: StockLoss[];
  totalValue: number;
  valueByReason: Record<StockLossReason, number>;
};
