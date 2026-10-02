"use client";

import { Printer, ReceiptText } from "lucide-react";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  connectThermalPrinter,
  getThermalPaperColumns,
  isThermalPrintingSupported,
  printThermalReceipt,
  reconnectThermalPrinter,
  setThermalPaperWidth,
  setThermalPrintingEnabled,
  THERMAL_PAPER_WIDTHS,
  type ThermalPaperWidth,
  useThermalPrinterSettings,
} from "@/lib/thermal-printer";

const PAPER_WIDTH_OPTIONS = THERMAL_PAPER_WIDTHS.map((paperWidth) => ({
  value: paperWidth,
  label: paperWidth,
}));

function subscribeToNothing() {
  return () => undefined;
}

function getIsSupportedOnServer() {
  return false;
}

function isThermalPaperWidth(value: unknown): value is ThermalPaperWidth {
  return THERMAL_PAPER_WIDTHS.some((paperWidth) => paperWidth === value);
}

function buildErrorMessage(prefix: string, error: unknown) {
  return error instanceof Error ? `${prefix}: ${error.message}` : prefix;
}

async function encodeTestReceipt(columns: number): Promise<Uint8Array> {
  const { startReceipt } = await import(
    "@/features/orders/thermal-order-ticket"
  );
  return startReceipt(columns)
    .align("center")
    .bold(true)
    .text("Teste de impressão")
    .bold(false)
    .newline()
    .text("Tably")
    .newline()
    .rule()
    .align("left")
    .text("Se você está lendo isso, a impressora está pronta.")
    .newline(6)
    .cut()
    .encode();
}

export function ThermalPrinterSettings() {
  const switchId = useId();
  const isSupported = useSyncExternalStore(
    subscribeToNothing,
    isThermalPrintingSupported,
    getIsSupportedOnServer,
  );
  const { isEnabled, paperWidth, printerName } = useThermalPrinterSettings();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupported) return;
    reconnectThermalPrinter().catch(() => undefined);
  }, [isSupported]);

  async function pairPrinter() {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      const connectedName = await connectThermalPrinter();
      setThermalPrintingEnabled(true);
      toast.success(`Impressora ${connectedName} pareada.`);
    } catch (error) {
      const message = buildErrorMessage(
        "Não foi possível parear a impressora",
        error,
      );
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsConnecting(false);
    }
  }

  async function printTest() {
    setIsTesting(true);
    setErrorMessage(null);
    try {
      await printThermalReceipt(
        await encodeTestReceipt(getThermalPaperColumns()),
      );
      toast.success("Teste enviado para a impressora.");
    } catch (error) {
      const message = buildErrorMessage("O teste não foi impresso", error);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <section className="flex max-w-2xl flex-col gap-6 rounded-2xl border bg-card p-6">
      <header className="flex flex-col gap-1">
        <h2 className="font-semibold text-lg">Impressora térmica</h2>
        <p className="text-muted-foreground text-sm">
          Imprime os tickets direto na impressora USB, sem abrir a janela de
          impressão. A configuração vale só para este computador, então faça em
          cada aparelho que imprime.
        </p>
      </header>

      {!isSupported ? (
        <p className="rounded-lg bg-muted px-4 py-3 text-muted-foreground text-sm">
          Este navegador não imprime direto via USB. Use o Chrome ou o Edge no
          computador do caixa.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <label htmlFor={switchId} className="font-medium text-sm">
                Imprimir direto na impressora
              </label>
              <p className="text-muted-foreground text-sm">
                {printerName
                  ? `Impressora pareada: ${printerName}`
                  : "Nenhuma impressora pareada ainda."}
              </p>
            </div>
            <Switch
              id={switchId}
              checked={isEnabled}
              disabled={!printerName}
              onCheckedChange={setThermalPrintingEnabled}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">Largura do papel</span>
              <p className="text-muted-foreground text-sm">
                Ajusta quantos caracteres cabem por linha.
              </p>
            </div>
            <Select
              items={PAPER_WIDTH_OPTIONS}
              value={paperWidth}
              onValueChange={(value) => {
                if (isThermalPaperWidth(value)) setThermalPaperWidth(value);
              }}
            >
              <SelectTrigger className="h-10 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAPER_WIDTH_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 px-5"
              disabled={isConnecting}
              aria-busy={isConnecting}
              onClick={pairPrinter}
            >
              <Printer aria-hidden />
              {printerName ? "Parear outra impressora" : "Parear impressora"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 px-5"
              disabled={!printerName || isTesting}
              aria-busy={isTesting}
              onClick={printTest}
            >
              <ReceiptText aria-hidden />
              Imprimir teste
            </Button>
          </div>

          {errorMessage && (
            <p className="rounded-lg bg-destructive/10 px-4 py-3 text-destructive text-sm">
              {errorMessage}
            </p>
          )}
        </>
      )}
    </section>
  );
}
