import { CalendarOff, MoreHorizontal, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  describeScheduleDay,
  getWeekdayShortLabel,
} from "@/features/employees/work-schedule-labels";
import { TIME_OFF_KIND_LABELS } from "@/features/time-clock/labels";
import {
  formatMinutes,
  formatSignedMinutes,
} from "@/features/time-clock/time-utils";
import type {
  TimesheetDay,
  TimesheetPunch,
} from "@/features/time-clock/timesheet";
import { cn } from "@/lib/utils";
import { DayPunchList } from "./day-punch-list";

type TimesheetDayRowProps = {
  day: TimesheetDay;
  onOpenPunch: (punch: TimesheetPunch) => void;
  onAdjustDay: (date: string) => void;
  onAddTimeOff: (date: string) => void;
};

function getDayBadges(day: TimesheetDay) {
  const badges: { label: string; isAlert: boolean }[] = [];
  if (day.kind === "holiday") {
    badges.push({ label: day.holidayName ?? "Feriado", isAlert: false });
  }
  if (
    day.kind === "time_off" &&
    day.timeOffKind &&
    day.timeOffKind !== "unjustified_absence"
  ) {
    badges.push({
      label: TIME_OFF_KIND_LABELS[day.timeOffKind],
      isAlert: false,
    });
  }
  if (day.kind === "rest_day") {
    badges.push({ label: "Descanso", isAlert: false });
  }
  if (day.isAbsence) badges.push({ label: "Falta", isAlert: true });
  if (day.lateMinutes > 0) {
    badges.push({
      label: `Atraso ${formatMinutes(day.lateMinutes)}`,
      isAlert: true,
    });
  }
  if (day.earlyLeaveMinutes > 0) {
    badges.push({
      label: `Saiu ${formatMinutes(day.earlyLeaveMinutes)} antes`,
      isAlert: true,
    });
  }
  if (day.hasOddPunches) {
    badges.push({ label: "Marcação faltando", isAlert: true });
  }
  if (day.breakShortfallMinutes > 0) {
    badges.push({
      label: `Intervalo curto ${formatMinutes(day.breakShortfallMinutes)}`,
      isAlert: true,
    });
  }
  if (day.hasShortRest) {
    badges.push({ label: "Descanso < 11h", isAlert: true });
  }
  if (day.nightMinutes > 0) {
    badges.push({
      label: `Noturno ${formatMinutes(day.nightMinutes)}`,
      isAlert: false,
    });
  }
  return badges;
}

export function TimesheetDayRow({
  day,
  onOpenPunch,
  onAdjustDay,
  onAddTimeOff,
}: TimesheetDayRowProps) {
  const isOutside = day.kind === "not_employed";
  const badges = getDayBadges(day);
  const [, month, dayOfMonth] = day.date.split("-");

  return (
    <li
      className={cn(
        "grid grid-cols-[3.5rem_1fr_auto] items-start gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[4.5rem_minmax(0,1.4fr)_5rem_5rem_5rem_minmax(0,1.2fr)_2rem] md:items-center",
        isOutside && "opacity-40",
        (day.kind === "rest_day" || day.kind === "holiday") && "bg-muted/40",
      )}
    >
      <button
        type="button"
        disabled={isOutside}
        aria-label={`Ajustar dia ${dayOfMonth}/${month}`}
        className="flex flex-col rounded-md text-left leading-tight transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed"
        onClick={() => onAdjustDay(day.date)}
      >
        <span className="font-semibold tabular-nums">
          {dayOfMonth}/{month}
        </span>
        <span className="text-muted-foreground text-xs">
          {getWeekdayShortLabel(day.weekday)}
        </span>
      </button>

      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap gap-1.5">
          {day.punches.length === 0 ? (
            <span className="text-muted-foreground text-sm">
              {day.isPending || isOutside ? "" : "Sem marcações"}
            </span>
          ) : (
            <DayPunchList punches={day.punches} onOpenPunch={onOpenPunch} />
          )}
        </div>
        {day.schedule && (
          <span className="text-muted-foreground text-xs md:hidden">
            Previsto {describeScheduleDay(day.schedule)}
          </span>
        )}
      </div>

      <div className="row-span-2 flex flex-col items-end gap-0.5 text-sm tabular-nums md:hidden">
        <span>
          {day.workedMinutes > 0 ? formatMinutes(day.workedMinutes) : "—"}
        </span>
        {day.balanceMinutes !== 0 && (
          <span
            className={cn(
              "font-medium text-xs",
              day.balanceMinutes < 0 && "text-destructive",
            )}
          >
            {formatSignedMinutes(day.balanceMinutes)}
          </span>
        )}
      </div>

      <span className="hidden text-muted-foreground text-sm tabular-nums md:block md:text-right">
        {day.expectedMinutes > 0 ? formatMinutes(day.expectedMinutes) : "—"}
      </span>
      <span className="hidden text-sm tabular-nums md:block md:text-right">
        {day.workedMinutes > 0 ? formatMinutes(day.workedMinutes) : "—"}
      </span>
      <span
        className={cn(
          "hidden font-medium text-sm tabular-nums md:block md:text-right",
          day.balanceMinutes < 0 && "text-destructive",
          day.balanceMinutes === 0 && "font-normal text-muted-foreground",
        )}
      >
        {day.balanceMinutes !== 0
          ? formatSignedMinutes(day.balanceMinutes)
          : "—"}
      </span>

      <div className="col-span-2 col-start-2 flex flex-wrap gap-1 md:col-span-1 md:col-start-auto">
        {badges.map((badge) => (
          <Badge
            key={badge.label}
            variant={badge.isAlert ? "destructive" : "secondary"}
          >
            {badge.label}
          </Badge>
        ))}
      </div>

      {!isOutside && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Ações do dia ${dayOfMonth}/${month}`}
                className="col-start-3 row-start-1 justify-self-end max-md:hidden md:col-start-auto md:row-start-auto"
              />
            }
          >
            <MoreHorizontal aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuItem onClick={() => onAdjustDay(day.date)}>
              <PenLine aria-hidden />
              Ajustar dia
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddTimeOff(day.date)}>
              <CalendarOff aria-hidden />
              Lançar ausência
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
