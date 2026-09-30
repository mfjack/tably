"use client";

import { useOfflineOrderSync } from "@/features/pos/hooks/use-offline-order-sync";

export function OfflineOrderSync() {
  useOfflineOrderSync();
  return null;
}
