"use client";

import { useSyncExternalStore } from "react";

const ENABLED_STORAGE_KEY = "tably-thermal-printer-enabled";
const DEVICE_STORAGE_KEY = "tably-thermal-printer-device";
const RAWBT_STORAGE_KEY = "tably-thermal-printer-rawbt";
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
const RAWBT_PRINTER_NAME = "RawBT";

type ConnectedThermalPrinter = {
  device: ThermalPrinterUsbDevice;
  endpointNumber: number;
  productName: string;
};

type SavedThermalPrinterDevice = {
  vendorId: number;
  productId: number;
  serialNumber: string | null;
  productName: string;
};

type ThermalPrinterEndpoint = {
  direction: "in" | "out";
  endpointNumber: number;
};

type ThermalPrinterAlternate = {
  endpoints: ThermalPrinterEndpoint[];
};

type ThermalPrinterInterface = {
  interfaceNumber: number;
  alternates: ThermalPrinterAlternate[];
};

type ThermalPrinterConfiguration = {
  configurationValue: number;
  interfaces: ThermalPrinterInterface[];
};

type ThermalPrinterTransferResult = {
  status: "ok" | "stall" | "babble";
};

export type ThermalPrinterUsbDevice = {
  opened: boolean;
  configuration: ThermalPrinterConfiguration | null;
  configurations: ThermalPrinterConfiguration[];
  productName: string | null;
  vendorId: number;
  productId: number;
  serialNumber: string | null;
  open(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(
    endpointNumber: number,
    data: BufferSource,
  ): Promise<ThermalPrinterTransferResult>;
};

export type ThermalPrinterUsb = {
  requestDevice(options: {
    filters: never[];
  }): Promise<ThermalPrinterUsbDevice>;
  getDevices(): Promise<ThermalPrinterUsbDevice[]>;
  addEventListener(
    type: "connect" | "disconnect",
    listener: (event: Event) => void,
  ): void;
  removeEventListener(
    type: "connect" | "disconnect",
    listener: (event: Event) => void,
  ): void;
};

type NavigatorWithUsb = Navigator & {
  usb: ThermalPrinterUsb;
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

function removeStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
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

function hasWebUsb(value: Navigator): value is NavigatorWithUsb {
  return "usb" in value && typeof value.usb === "object" && value.usb !== null;
}

export function getThermalPrinterUsb(): ThermalPrinterUsb | null {
  if (typeof navigator === "undefined" || !hasWebUsb(navigator)) return null;
  return navigator.usb;
}

export function isThermalPrintingSupported(): boolean {
  return isRawBtSupported() || getThermalPrinterUsb() !== null;
}

export function isRawBtSupported(): boolean {
  return (
    typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)
  );
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
  if (readStorage(RAWBT_STORAGE_KEY) === "true") return RAWBT_PRINTER_NAME;
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
  device: ThermalPrinterUsbDevice,
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
  if (isRawBtSupported()) {
    writeStorage(RAWBT_STORAGE_KEY, "true");
    return RAWBT_PRINTER_NAME;
  }

  const usb = getThermalPrinterUsb();
  if (!usb) {
    throw new Error("Este navegador não oferece suporte à impressão USB.");
  }
  const device = await usb.requestDevice({ filters: [] });
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
  if (isRawBtSupported()) {
    return readStorage(RAWBT_STORAGE_KEY) === "true"
      ? RAWBT_PRINTER_NAME
      : null;
  }
  if (!isThermalPrintingSupported()) return null;
  if (connectedPrinter?.device.opened) return connectedPrinter.productName;

  const savedDevice = getSavedDevice();
  if (!savedDevice) return null;

  const usb = getThermalPrinterUsb();
  if (!usb) return null;
  const devices = await usb.getDevices();
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

export function forgetThermalPrinter(device: ThermalPrinterUsbDevice) {
  if (connectedPrinter?.device === device) connectedPrinter = null;
}

function printWithRawBt(bytes: Uint8Array): Promise<void> {
  const rawData = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
    "",
  );
  const printUrl = `rawbt:${encodeURIComponent(rawData)}`;
  const link = document.createElement("a");
  link.href = printUrl;
  link.setAttribute("aria-hidden", "true");
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  return Promise.resolve();
}

async function transferReceiptBytes(bytes: Uint8Array) {
  if (isRawBtSupported() && readStorage(RAWBT_STORAGE_KEY) === "true") {
    await printWithRawBt(bytes);
    return;
  }

  if (!connectedPrinter) await reconnectThermalPrinter();
  if (!connectedPrinter) {
    throw new Error("Nenhuma impressora térmica conectada.");
  }

  await connectedPrinter.device.transferOut(
    connectedPrinter.endpointNumber,
    bytes as BufferSource,
  );
}

export function printThermalReceipt(bytes: Uint8Array): Promise<void> {
  const job = printQueue.then(() => transferReceiptBytes(bytes));
  printQueue = job.catch(() => undefined);
  return job;
}

export function disableRawBtPrinting() {
  removeStorage(RAWBT_STORAGE_KEY);
}
