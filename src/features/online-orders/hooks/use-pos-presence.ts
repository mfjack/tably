import { useEffect } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import { useTouchPosPresenceMutation } from "./use-touch-pos-presence-mutation";

const PRESENCE_INTERVAL_IN_MILLISECONDS = 60_000;

export function usePosPresence(organizationId: OrganizationId) {
  const { mutate: touchPresence } = useTouchPosPresenceMutation(organizationId);

  useEffect(() => {
    function touchWhenVisible() {
      if (document.visibilityState === "visible" && navigator.onLine) {
        touchPresence();
      }
    }

    touchWhenVisible();
    const intervalId = window.setInterval(
      touchWhenVisible,
      PRESENCE_INTERVAL_IN_MILLISECONDS,
    );
    document.addEventListener("visibilitychange", touchWhenVisible);
    window.addEventListener("online", touchWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", touchWhenVisible);
      window.removeEventListener("online", touchWhenVisible);
    };
  }, [touchPresence]);
}
