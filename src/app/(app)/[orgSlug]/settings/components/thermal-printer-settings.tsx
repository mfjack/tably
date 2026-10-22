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
  setThermalPrinterMode,
  setThermalPrintingEnabled,
  THERMAL_PAPER_WIDTHS,
  THERMAL_PRINTER_MODES,
  type ThermalPaperWidth,
  type ThermalPrinterMode,
  useThermalPrinterSettings,
} from "@/lib/thermal-printer";

const PAPER_WIDTH_OPTIONS = THERMAL_PAPER_WIDTHS.map((paperWidth) => ({
  value: paperWidth,
  label: paperWidth,
}));
const PRINTER_MODE_LABELS = {
  usb: "Cabo USB",
  rawbt: "Rede (RawBT)",
} as const satisfies Record<ThermalPrinterMode, string>;

const PRINTER_MODE_OPTIONS = THERMAL_PRINTER_MODES.map((mode) => ({
  value: mode,
  label: PRINTER_MODE_LABELS[mode],
}));

function isThermalPrinterMode(value: unknown): value is ThermalPrinterMode {
  return THERMAL_PRINTER_MODES.some((mode) => mode === value);
}

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
  const { isEnabled, paperWidth, printerName, mode } =
    useThermalPrinterSettings();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasConfiguredPrinter = mode === "rawbt" || Boolean(printerName);

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
          Imprime os tickets direto na impressora, sem abrir a janela de
          impressão. A configuração vale só para este aparelho, então faça em
          cada um que imprime.
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
              <span className="font-medium text-sm">Como imprimir</span>
              <p className="text-muted-foreground text-sm">
                {mode === "rawbt"
                  ? "Pelo app RawBT, configurado com a impressora da rede (Wi-Fi ou cabo de rede)."
                  : "Pela impressora ligada no cabo USB deste aparelho."}
              </p>
            </div>
            <Select
              items={PRINTER_MODE_OPTIONS}
              value={mode}
              onValueChange={(value) => {
                if (isThermalPrinterMode(value)) setThermalPrinterMode(value);
              }}
            >
              <SelectTrigger className="h-10 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRINTER_MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <label htmlFor={switchId} className="font-medium text-sm">
                Imprimir direto na impressora
              </label>
              <p className="text-muted-foreground text-sm">
                {mode === "rawbt"
                  ? "Os tickets vão direto para o RawBT."
                  : printerName
                    ? `Impressora pareada: ${printerName}`
                    : "Nenhuma impressora pareada ainda."}
              </p>
            </div>
            <Switch
              id={switchId}
              checked={isEnabled}
              disabled={!hasConfiguredPrinter}
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
            {mode === "usb" && (
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
            )}
            <Button
              type="button"
              variant="outline"
              className="h-11 px-5"
              disabled={!hasConfiguredPrinter || isTesting}
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
