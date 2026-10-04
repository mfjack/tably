"use client";

import { useSyncExternalStore } from "react";

const ENABLED_STORAGE_KEY = "tably-thermal-printer-enabled";
const DEVICE_STORAGE_KEY = "tably-thermal-printer-device";
const PAPER_WIDTH_STORAGE_KEY = "tably-thermal-printer-paper-width";
const SETTINGS_CHANGE_EVENT = "tably-thermal-printer-change";

export const THERMAL_PAPER_WIDTHS = ["58mm", "80mm"] as const;

export type ThermalPaperWidth = (typeof THERMAL_PAPER_WIDTHS)[number];

const PAPER_COLUMNS = {
  "58mm": 32,
  "80mm": 42,
} as const satisfies Record<ThermalPaperWidth, number>;

const DEFAULT_PAPER_WIDTH: ThermalPaperWidth = "80mm";
const DEFAULT_PRINTER_NAME = "Impressora térmica";
const TRANSFER_TIMEOUT_IN_MS = 8_000;

type ConnectedThermalPrinter = {
  device: USBDevice;
  endpointNumber: number;
  productName: string;
};

type SavedThermalPrinterDevice = {
  vendorId: number;
  productId: number;
  serialNumber: string | null;
  productName: string;
};

let connectedPrinter: ConnectedThermalPrinter | null = null;
let printQueue: Promise<void> = Promise.resolve();

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(SETTINGS_CHANGE_EVENT));
}

function getSavedDevice(): SavedThermalPrinterDevice | null {
  const storedDevice = readStorage(DEVICE_STORAGE_KEY);
  if (!storedDevice) return null;

  try {
    return JSON.parse(storedDevice) as SavedThermalPrinterDevice;
  } catch {
    return null;
  }
}

function isThermalPaperWidth(value: string | null): value is ThermalPaperWidth {
  return THERMAL_PAPER_WIDTHS.some((paperWidth) => paperWidth === value);
}

export function isThermalPrintingSupported(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

export function isThermalPrintingEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return readStorage(ENABLED_STORAGE_KEY) === "true";
}

export function setThermalPrintingEnabled(isEnabled: boolean) {
  writeStorage(ENABLED_STORAGE_KEY, String(isEnabled));
}

export function getThermalPaperWidth(): ThermalPaperWidth {
  if (typeof window === "undefined") return DEFAULT_PAPER_WIDTH;
  const storedWidth = readStorage(PAPER_WIDTH_STORAGE_KEY);
  return isThermalPaperWidth(storedWidth) ? storedWidth : DEFAULT_PAPER_WIDTH;
}

export function setThermalPaperWidth(paperWidth: ThermalPaperWidth) {
  writeStorage(PAPER_WIDTH_STORAGE_KEY, paperWidth);
}

export function getThermalPaperColumns(): number {
  return PAPER_COLUMNS[getThermalPaperWidth()];
}

export function getSavedThermalPrinterName(): string | null {
  if (typeof window === "undefined") return null;
  return getSavedDevice()?.productName ?? null;
}

function subscribeToSettings(onChange: () => void) {
  window.addEventListener(SETTINGS_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(SETTINGS_CHANGE_EVENT, onChange);
}

function getEnabledOnServer() {
  return false;
}

function getPaperWidthOnServer(): ThermalPaperWidth {
  return DEFAULT_PAPER_WIDTH;
}

function getPrinterNameOnServer() {
  return null;
}

export function useThermalPrinterSettings() {
  const isEnabled = useSyncExternalStore(
    subscribeToSettings,
    isThermalPrintingEnabled,
    getEnabledOnServer,
  );
  const paperWidth = useSyncExternalStore(
    subscribeToSettings,
    getThermalPaperWidth,
    getPaperWidthOnServer,
  );
  const printerName = useSyncExternalStore(
    subscribeToSettings,
    getSavedThermalPrinterName,
    getPrinterNameOnServer,
  );

  return { isEnabled, paperWidth, printerName };
}

async function openPrinterDevice(
  device: USBDevice,
): Promise<ConnectedThermalPrinter> {
  if (!device.opened) await device.open();

  const configuration = device.configuration ?? device.configurations[0];
  if (!configuration) {
    throw new Error("A impressora não informou como receber dados.");
  }
  if (device.configuration === null) {
    await device.selectConfiguration(configuration.configurationValue);
  }

  const printerInterface = configuration.interfaces.find((usbInterface) =>
    usbInterface.alternates.some((alternate) =>
      alternate.endpoints.some((endpoint) => endpoint.direction === "out"),
    ),
  );
  if (!printerInterface) {
    throw new Error(
      "Não foi possível encontrar uma interface de impressão nesse dispositivo USB.",
    );
  }

  try {
    await device.claimInterface(printerInterface.interfaceNumber);
  } catch {
    throw new Error(
      "A porta USB está sendo usada por outro driver. Troque o driver da impressora para WinUSB com o Zadig (zadig.akeo.ie) e pareie de novo.",
    );
  }

  const outEndpoint = printerInterface.alternates
    .flatMap((alternate) => alternate.endpoints)
    .find((endpoint) => endpoint.direction === "out");
  if (!outEndpoint) {
    throw new Error(
      "Não foi possível encontrar uma saída de dados nesse dispositivo USB.",
    );
  }

  connectedPrinter = {
    device,
    endpointNumber: outEndpoint.endpointNumber,
    productName: device.productName || DEFAULT_PRINTER_NAME,
  };
  return connectedPrinter;
}

export async function connectThermalPrinter(): Promise<string> {
  const device = await navigator.usb.requestDevice({ filters: [] });
  const printer = await openPrinterDevice(device);

  writeStorage(
    DEVICE_STORAGE_KEY,
    JSON.stringify({
      vendorId: device.vendorId,
      productId: device.productId,
      serialNumber: device.serialNumber ?? null,
      productName: printer.productName,
    } satisfies SavedThermalPrinterDevice),
  );
  return printer.productName;
}

export async function reconnectThermalPrinter(): Promise<string | null> {
  if (!isThermalPrintingSupported()) return null;
  if (connectedPrinter?.device.opened) return connectedPrinter.productName;

  const savedDevice = getSavedDevice();
  if (!savedDevice) return null;

  const devices = await navigator.usb.getDevices();
  const device = devices.find(
    (candidate) =>
      candidate.vendorId === savedDevice.vendorId &&
      candidate.productId === savedDevice.productId &&
      (savedDevice.serialNumber === null ||
        candidate.serialNumber === savedDevice.serialNumber),
  );
  if (!device) return null;

  const printer = await openPrinterDevice(device);
  return printer.productName;
}

export function forgetThermalPrinter(device: USBDevice) {
  if (connectedPrinter?.device === device) connectedPrinter = null;
}

function rejectAfterTimeout(): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error("a impressora não respondeu")),
      TRANSFER_TIMEOUT_IN_MS,
    );
  });
}

async function transferReceiptBytes(bytes: Uint8Array) {
  if (!connectedPrinter) await reconnectThermalPrinter();
  if (!connectedPrinter) {
    throw new Error("Nenhuma impressora térmica conectada.");
  }

  const printer = connectedPrinter;
  try {
    await Promise.race([
      printer.device.transferOut(printer.endpointNumber, bytes as BufferSource),
      rejectAfterTimeout(),
    ]);
  } catch (error) {
    connectedPrinter = null;
    throw error;
  }
}

export function printThermalReceipt(bytes: Uint8Array): Promise<void> {
  const job = printQueue.then(() => transferReceiptBytes(bytes));
  printQueue = job.catch(() => undefined);
  return job;
}
