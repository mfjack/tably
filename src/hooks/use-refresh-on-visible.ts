import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const MIN_REFRESH_INTERVAL_IN_MS = 10_000;

export function useRefreshOnVisible() {
  const router = useRouter();
  const lastRefreshAtRef = useRef(Date.now());

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshAtRef.current < MIN_REFRESH_INTERVAL_IN_MS) return;
      lastRefreshAtRef.current = now;
      router.refresh();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [router]);
}
