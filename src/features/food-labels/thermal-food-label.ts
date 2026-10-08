import {
  finishReceipt,
  startReceipt,
} from "@/features/orders/thermal-order-ticket";
import { STORAGE_CONDITION_DETAILS } from "./labels";
import { type FoodLabel, formatLabelDate } from "./print-food-label";

const LABEL_GAP_LINES = 3;

export function encodeFoodLabel(
  label: FoodLabel,
  totalColumns: number,
): Uint8Array {
  const encoder = startReceipt(totalColumns);
  const columns = [
    { width: 12, align: "left" as const },
    { width: encoder.columns - 12, align: "right" as const },
  ];

  for (let copyIndex = 0; copyIndex < label.copies; copyIndex++) {
    if (copyIndex > 0) encoder.newline(LABEL_GAP_LINES).cut();
    encoder
      .bold(true)
      .size(2, 2)
      .text(label.name.toUpperCase())
      .size(1, 1)
      .newline()
      .text(STORAGE_CONDITION_DETAILS[label.storage])
      .bold(false)
      .newline()
      .rule()
      .table(columns, [["Manipulação", formatLabelDate(label.preparedAt)]])
      .bold(true)
      .table(columns, [["Validade", formatLabelDate(label.expiresAt)]])
      .bold(false)
      .table(columns, [["Responsável", label.responsibleName]]);
  }

  return finishReceipt(encoder);
}
