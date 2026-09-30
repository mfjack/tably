import { onlineManager } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import { useLockOperatorMutation } from "./use-lock-operator-mutation";

const HEARTBEAT_INTERVAL_IN_MS = 15 * 1000;
const AWAY_THRESHOLD_IN_MS = 2 * 60 * 1000;

function getHeartbeatKey(organizationId: OrganizationId) {
  return `tably-operator-heartbeat:${organizationId}`;
}

function readHeartbeat(organizationId: OrganizationId): number | null {
  try {
    const storedValue = window.localStorage.getItem(
      getHeartbeatKey(organizationId),
    );
    return storedValue ? Number(storedValue) : null;
  } catch {
    return null;
  }
}

function writeHeartbeat(organizationId: OrganizationId, timestamp: number) {
  try {
    window.localStorage.setItem(
      getHeartbeatKey(organizationId),
      String(timestamp),
    );
  } catch {}
}

let hasHandledDocumentLoad = false;

function isReload() {
  const [navigationEntry] = performance.getEntriesByType("navigation");
  return (
    navigationEntry instanceof PerformanceNavigationTiming &&
    navigationEntry.type === "reload"
  );
}

function consumeFreshDocumentLoad() {
  const isFreshDocumentLoad = !hasHandledDocumentLoad && !isReload();
  hasHandledDocumentLoad = true;
  return isFreshDocumentLoad;
}

export function useOperatorAutoLock(
  organizationId: OrganizationId,
  isUnlocked: boolean,
) {
  const router = useRouter();
  const { mutate: lockOperator } = useLockOperatorMutation(organizationId);

  useEffect(() => {
    let isLocking = false;

    function lockIfAway(wasClosed = false) {
      if (isLocking) return;

      const now = Date.now();
      const lastHeartbeat = readHeartbeat(organizationId);
      const wasAway =
        wasClosed ||
        (lastHeartbeat !== null && now - lastHeartbeat > AWAY_THRESHOLD_IN_MS);

      if (isUnlocked && wasAway && onlineManager.isOnline()) {
        isLocking = true;
        lockOperator(undefined, {
          onSuccess: () => router.refresh(),
          onSettled: () => {
            isLocking = false;
          },
        });
      }

      writeHeartbeat(organizationId, now);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") lockIfAway();
    }

    function handlePageShow(event: PageTransitionEvent) {
      lockIfAway(event.persisted);
    }

    lockIfAway(consumeFreshDocumentLoad());

    const heartbeatInterval = window.setInterval(
      () => lockIfAway(),
      HEARTBEAT_INTERVAL_IN_MS,
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.clearInterval(heartbeatInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [organizationId, isUnlocked, lockOperator, router]);
}
