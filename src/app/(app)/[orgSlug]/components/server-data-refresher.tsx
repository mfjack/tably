"use client";

import { useRefreshOnVisible } from "@/hooks/use-refresh-on-visible";

export function ServerDataRefresher() {
  useRefreshOnVisible();
  return null;
}
