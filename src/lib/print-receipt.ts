import { toast } from "sonner";
import { printHtml } from "./print-html";
import {
  getThermalPaperColumns,
  isThermalPrintingEnabled,
  printThermalReceipt,
} from "./thermal-printer";

type ReceiptPrintJob = {
  html: string;
  encode: (columns: number) => Promise<Uint8Array>;
};

function buildThermalFailureMessage(error: unknown): string {
  const reason = error instanceof Error ? ` (${error.message})` : "";
  return `Não foi possível imprimir na impressora térmica${reason}. Imprimindo pelo navegador.`;
}

async function printOnThermalPrinter({ html, encode }: ReceiptPrintJob) {
  try {
    await printThermalReceipt(await encode(getThermalPaperColumns()));
  } catch (error) {
    toast.error(buildThermalFailureMessage(error));
    printHtml(html);
  }
}

export function printReceipt(job: ReceiptPrintJob): void {
  if (!isThermalPrintingEnabled()) {
    printHtml(job.html);
    return;
  }
  void printOnThermalPrinter(job);
}
