import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}

export function formatMonthName(date: Date): string {
  return capitalize(format(date, "MMMM", { locale: ptBR }));
}

export function formatWeekdayAndDate(date: Date): string {
  const weekday = capitalize(
    format(date, "EEEE", { locale: ptBR }).replace("-feira", ""),
  );
  return `${weekday}, ${format(date, "d")} de ${formatMonthName(date)}`;
}

export function formatMonthAndYear(date: Date): string {
  return `${formatMonthName(date)} de ${format(date, "yyyy")}`;
}
