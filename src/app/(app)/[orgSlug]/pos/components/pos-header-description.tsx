"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatToday(): string {
  const weekdayAndDate = format(new Date(), "EEEE, d 'de' MMMM", {
    locale: ptBR,
  }).replace("-feira", "");

  return weekdayAndDate.charAt(0).toUpperCase() + weekdayAndDate.slice(1);
}

export function PosHeaderDescription() {
  return <span suppressHydrationWarning>{formatToday()}</span>;
}
