import { Constants } from "@/lib/supabase/database.types";
import type { StockLossReason } from "./types";

export const STOCK_LOSS_REASONS = Constants.public.Enums.stock_loss_reason;

export const STOCK_LOSS_REASON_LABELS = {
  expired: "Venceu",
  spoiled: "Estragou",
  preparation_error: "Erro no preparo",
  dropped: "Caiu ou derramou",
  other: "Outro",
} as const satisfies Record<StockLossReason, string>;
