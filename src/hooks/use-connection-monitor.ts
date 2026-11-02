import { onlineManager } from "@tanstack/react-query";
import { useEffect } from "react";

const HEALTH_CHECK_URL = "/api/health";
const CHECK_INTERVAL_IN_MS = 15_000;
const CHECK_TIMEOUT_IN_MS = 5_000;

async function checkConnection(): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_IN_MS);
  try {
    const response = await fetch(HEALTH_CHECK_URL, {
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function useConnectionMonitor() {
  useEffect(() => {
    let isChecking = false;

    async function updateConnectionStatus() {
      if (isChecking) return;
      if (!navigator.onLine) {
        onlineManager.setOnline(false);
        return;
      }
      isChecking = true;
      onlineManager.setOnline(await checkConnection());
      isChecking = false;
    }

    void updateConnectionStatus();
    const intervalId = window.setInterval(
      () => void updateConnectionStatus(),
      CHECK_INTERVAL_IN_MS,
    );
    window.addEventListener("online", updateConnectionStatus);
    window.addEventListener("offline", updateConnectionStatus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("online", updateConnectionStatus);
      window.removeEventListener("offline", updateConnectionStatus);
    };
  }, []);
}
