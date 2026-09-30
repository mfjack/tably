import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

function subscribeToOnlineStatus(onChange: () => void) {
  return onlineManager.subscribe(onChange);
}

function getIsOnline() {
  return onlineManager.isOnline();
}

function getIsOnlineOnServer() {
  return true;
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(
    subscribeToOnlineStatus,
    getIsOnline,
    getIsOnlineOnServer,
  );
}
