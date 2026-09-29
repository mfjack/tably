import { useEffect, useState } from "react";

export function useNow(intervalInMs: number): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(
      () => setNow(new Date()),
      intervalInMs,
    );
    return () => window.clearInterval(intervalId);
  }, [intervalInMs]);

  return now;
}
