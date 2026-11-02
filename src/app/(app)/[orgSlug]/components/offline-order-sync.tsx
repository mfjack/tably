"use client";

import { useOfflineOrderSync } from "@/features/pos/hooks/use-offline-order-sync";
import { useConnectionMonitor } from "@/hooks/use-connection-monitor";

export function OfflineOrderSync() {
  useConnectionMonitor();
  useOfflineOrderSync();
  return null;
}
