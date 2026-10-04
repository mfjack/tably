"use client";

import { useEffect, useState } from "react";
import {
  forgetThermalPrinter,
  isThermalPrintingSupported,
  reconnectThermalPrinter,
  useThermalPrinterSettings,
} from "@/lib/thermal-printer";

export type ThermalPrinterStatus = "idle" | "connected" | "disconnected";

export function useThermalPrinterStatus(): ThermalPrinterStatus {
  const { isEnabled } = useThermalPrinterSettings();
  const [status, setStatus] = useState<ThermalPrinterStatus>("idle");

  useEffect(() => {
    if (!isEnabled) return;
    let isActive = true;

    function checkConnection() {
      reconnectThermalPrinter()
        .then((printerName) => {
          if (isActive) setStatus(printerName ? "connected" : "disconnected");
        })
        .catch(() => {
          if (isActive) setStatus("disconnected");
        });
    }

    function handleDisconnect(event: USBConnectionEvent) {
      forgetThermalPrinter(event.device);
      checkConnection();
    }

    checkConnection();
    if (!isThermalPrintingSupported()) return;

    navigator.usb.addEventListener("connect", checkConnection);
    navigator.usb.addEventListener("disconnect", handleDisconnect);
    return () => {
      isActive = false;
      navigator.usb.removeEventListener("connect", checkConnection);
      navigator.usb.removeEventListener("disconnect", handleDisconnect);
    };
  }, [isEnabled]);

  return isEnabled ? status : "idle";
}
