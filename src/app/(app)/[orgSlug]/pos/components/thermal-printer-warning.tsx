"use client";

import { PrinterX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useThermalPrinterStatus } from "@/hooks/use-thermal-printer-status";

type ThermalPrinterWarningProps = {
  settingsHref: string;
};

export function ThermalPrinterWarning({
  settingsHref,
}: ThermalPrinterWarningProps) {
  const status = useThermalPrinterStatus();
  if (status !== "disconnected") return null;

  return (
    <Button
      variant="outline"
      className="h-11 border-destructive/40 px-3 text-destructive hover:text-destructive sm:px-4"
      nativeButton={false}
      render={<Link href={settingsHref} />}
    >
      <PrinterX aria-hidden />
      <span className="hidden sm:inline">Impressora desconectada</span>
      <span className="sr-only sm:hidden">Impressora desconectada</span>
    </Button>
  );
}
