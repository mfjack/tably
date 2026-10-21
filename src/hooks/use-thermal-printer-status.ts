"use client";

import { useEffect, useState } from "react";
import {
  forgetThermalPrinter,
  getThermalPrinterUsb,
  isRawBtSupported,
  reconnectThermalPrinter,
  type ThermalPrinterUsbDevice,
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

    function handleDisconnect(event: Event) {
      const device = (event as Event & { device: ThermalPrinterUsbDevice })
        .device;
      forgetThermalPrinter(device);
      checkConnection();
    }

    checkConnection();
    const usb = getThermalPrinterUsb();
    if (isRawBtSupported() || !usb) return;

    usb.addEventListener("connect", checkConnection);
    usb.addEventListener("disconnect", handleDisconnect);
    return () => {
      isActive = false;
      usb.removeEventListener("connect", checkConnection);
      usb.removeEventListener("disconnect", handleDisconnect);
    };
  }, [isEnabled]);

  return isEnabled ? status : "idle";
}
