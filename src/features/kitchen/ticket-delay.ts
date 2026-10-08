import { differenceInMinutes } from "date-fns";
import type { KitchenTicket } from "./types";

export type TicketDelayLevel = "on_time" | "attention" | "late";

const ATTENTION_RATIO = 2 / 3;

export function getElapsedMinutes(ticket: KitchenTicket, now: Date): number {
  return Math.max(differenceInMinutes(now, new Date(ticket.createdAt)), 0);
}

export function getTicketDelayLevel(
  ticket: KitchenTicket,
  now: Date,
  lateMinutes: number,
): TicketDelayLevel {
  if (ticket.status !== "waiting" && ticket.status !== "preparing") {
    return "on_time";
  }
  const elapsedMinutes = getElapsedMinutes(ticket, now);
  if (elapsedMinutes >= lateMinutes) return "late";
  if (elapsedMinutes >= Math.ceil(lateMinutes * ATTENTION_RATIO)) {
    return "attention";
  }
  return "on_time";
}
