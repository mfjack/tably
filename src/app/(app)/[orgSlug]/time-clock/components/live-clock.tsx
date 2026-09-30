"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";

const TICK_INTERVAL_IN_MS = 1000;

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const intervalId = window.setInterval(
      () => setNow(new Date()),
      TICK_INTERVAL_IN_MS,
    );
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="font-semibold text-5xl tabular-nums tracking-tight sm:text-6xl">
        {now ? format(now, "HH:mm:ss") : "--:--:--"}
      </p>
      <p className="text-muted-foreground text-sm first-letter:uppercase">
        {now ? format(now, "EEEE, d 'de' MMMM", { locale: ptBR }) : " "}
      </p>
    </div>
  );
}
