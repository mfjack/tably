import { differenceInCalendarDays, parseISO, startOfToday } from "date-fns";

export const EXPIRY_WARNING_DAYS = 7;

export type ExpiryStatus =
  | { status: "none" }
  | { status: "expired" }
  | { status: "expiring"; daysLeft: number }
  | { status: "valid" };

export function getExpiryStatus(expiresAt: string | null): ExpiryStatus {
  if (!expiresAt) return { status: "none" };

  const daysLeft = differenceInCalendarDays(
    parseISO(expiresAt),
    startOfToday(),
  );

  if (daysLeft < 0) return { status: "expired" };
  if (daysLeft <= EXPIRY_WARNING_DAYS) return { status: "expiring", daysLeft };
  return { status: "valid" };
}
