import { format } from "date-fns";
import { escapeHtml } from "@/lib/print-html";
import { printReceipt } from "@/lib/print-receipt";
import { STORAGE_CONDITION_DETAILS, type StorageCondition } from "./labels";

export type FoodLabel = {
  name: string;
  storage: StorageCondition;
  preparedAt: Date;
  expiresAt: Date;
  responsibleName: string;
  copies: number;
};

const LABEL_DATE_FORMAT = "dd/MM/yyyy HH:mm";

const LABEL_STYLES = `
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; width: 72mm; }
  .label { border: 2px solid #000; padding: 8px; display: flex; flex-direction: column; gap: 4px; page-break-after: always; break-after: page; }
  .label:last-child { page-break-after: auto; break-after: auto; }
  .name { font-size: 20px; font-weight: 700; text-transform: uppercase; }
  .storage { font-size: 13px; font-weight: 700; border-bottom: 1px solid #000; padding-bottom: 4px; }
  .row { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; }
  .expires { font-size: 15px; font-weight: 700; }
`;

export function formatLabelDate(date: Date): string {
  return format(date, LABEL_DATE_FORMAT);
}

function buildLabelHtml(label: FoodLabel): string {
  const labelBody = `<div class="label">
    <p class="name">${escapeHtml(label.name)}</p>
    <p class="storage">${escapeHtml(STORAGE_CONDITION_DETAILS[label.storage])}</p>
    <p class="row"><span>Manipulação</span><span>${formatLabelDate(label.preparedAt)}</span></p>
    <p class="row expires"><span>Validade</span><span>${formatLabelDate(label.expiresAt)}</span></p>
    <p class="row"><span>Responsável</span><span>${escapeHtml(label.responsibleName)}</span></p>
  </div>`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Etiqueta ${escapeHtml(label.name)}</title><style>${LABEL_STYLES}</style></head><body>
    ${Array.from({ length: label.copies }, () => labelBody).join("")}
  </body></html>`;
}

async function encodeFoodLabelLazily(label: FoodLabel, columns: number) {
  const { encodeFoodLabel } = await import("./thermal-food-label");
  return encodeFoodLabel(label, columns);
}

export function printFoodLabel(label: FoodLabel): void {
  printReceipt({
    html: buildLabelHtml(label),
    encode: (columns) => encodeFoodLabelLazily(label, columns),
  });
}
