import { format } from "date-fns";
import {
  GRACE_PERIOD_IN_DAYS,
  type SubscriptionState,
  type SubscriptionStatus,
} from "./subscription-state";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const SUBSCRIPTION_STATUS_LABELS = {
  trial: "Teste grátis",
  active: "Ativa",
  courtesy: "Cortesia",
  grace: "Vencida",
  blocked: "Bloqueada",
} as const satisfies Record<SubscriptionStatus, string>;

function formatDate(date: Date) {
  return format(date, "dd/MM/yyyy");
}

function formatDaysLeft(daysLeft: number) {
  if (daysLeft === 0) return "termina hoje";
  return daysLeft === 1 ? "falta 1 dia" : `faltam ${daysLeft} dias`;
}

export function getSubscriptionStatusDescription(state: SubscriptionState) {
  const graceEndsAt = new Date(
    state.accessUntil.getTime() + GRACE_PERIOD_IN_DAYS * DAY_IN_MS,
  );

  switch (state.status) {
    case "trial":
      return `Teste grátis até ${formatDate(state.accessUntil)} (${formatDaysLeft(state.daysLeft)}).`;
    case "active":
      return `Paga até ${formatDate(state.accessUntil)}.`;
    case "courtesy":
      return "Cortesia, sem cobrança mensal.";
    case "grace":
      return `Venceu em ${formatDate(state.accessUntil)}. Pague até ${formatDate(graceEndsAt)} para não bloquear o sistema.`;
    case "blocked":
      return `Venceu em ${formatDate(state.accessUntil)}. O sistema está bloqueado até o pagamento.`;
  }
}
