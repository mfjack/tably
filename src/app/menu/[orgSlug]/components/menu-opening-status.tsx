"use client";

import { getISODay } from "date-fns";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { badgeVariants } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  describeOpeningStatus,
  formatOpeningDay,
  type OpeningHour,
  type OpeningStatus,
  summarizeOpeningStatus,
  toOpeningDays,
} from "@/features/organizations/opening-hours";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { getWeekdayLabel } from "@/lib/weekdays";

const REFRESH_INTERVAL_IN_MS = 30_000;

type MenuOpeningStatusProps = {
  status: OpeningStatus;
  hours: readonly OpeningHour[];
};

export function MenuOpeningStatus({ status, hours }: MenuOpeningStatusProps) {
  const router = useRouter();
  const now = useNow(REFRESH_INTERVAL_IN_MS);
  const summary = summarizeOpeningStatus(status);
  const detail = describeOpeningStatus(status);
  const todayWeekday = getISODay(now);
  const hasStatusChanged =
    summary?.nextChangeAt !== null &&
    summary?.nextChangeAt !== undefined &&
    now >= summary.nextChangeAt;

  useEffect(() => {
    if (hasStatusChanged) router.refresh();
  }, [hasStatusChanged, router]);

  if (!summary) return null;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          badgeVariants({
            variant: summary.isOpen ? "success" : "destructive",
          }),
          "h-8 gap-2 px-3 text-sm",
        )}
        aria-label={`${summary.label}${detail ? `, ${detail}` : ""}. Ver horário de funcionamento`}
      >
        <span
          aria-hidden
          className={cn(
            "size-2 rounded-full",
            summary.isOpen ? "bg-emerald-500" : "bg-destructive",
          )}
        />
        <span suppressHydrationWarning>
          {summary.label}
          {detail && ` · ${detail}`}
        </span>
        <ChevronDown aria-hidden className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="flex w-72 flex-col gap-2">
        <p className="font-semibold text-sm">Horário de funcionamento</p>
        <ul className="flex flex-col gap-1 text-sm">
          {toOpeningDays(hours).map((day) => (
            <li
              key={day.weekday}
              className={cn(
                "flex justify-between gap-4 rounded-md px-2 py-1",
                day.weekday === todayWeekday && "bg-muted font-medium",
                !day.isOpen && "text-muted-foreground",
              )}
            >
              <span>{getWeekdayLabel(day.weekday)}</span>
              <span className="tabular-nums">{formatOpeningDay(day)}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
