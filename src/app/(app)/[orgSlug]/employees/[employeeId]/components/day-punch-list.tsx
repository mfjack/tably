import { PenLine } from "lucide-react";
import { getPunchLabel } from "@/features/time-clock/print-punch-receipt";
import { formatClockTime } from "@/features/time-clock/time-utils";
import type { TimesheetPunch } from "@/features/time-clock/timesheet";
import { cn } from "@/lib/utils";

type DayPunchListProps = {
  punches: readonly TimesheetPunch[];
  onOpenPunch: (punch: TimesheetPunch) => void;
};

function describePunch(punch: TimesheetPunch): string {
  if (punch.voiding) return `Desconsiderada: ${punch.voiding.reason}`;
  if (punch.source === "manual") return `Incluída: ${punch.reason ?? ""}`;
  return `NSR ${punch.nsr}`;
}

export function DayPunchList({ punches, onOpenPunch }: DayPunchListProps) {
  let validIndex = 0;

  return (
    <div className="flex flex-wrap gap-1.5">
      {punches.map((punch) => {
        const label = punch.voiding ? null : getPunchLabel(validIndex++);
        return (
          <button
            key={punch.id}
            type="button"
            title={describePunch(punch)}
            className={cn(
              "inline-flex flex-col items-start rounded-md border px-2 py-0.5 text-left tabular-nums transition-colors hover:bg-muted",
              punch.voiding && "text-muted-foreground line-through",
              punch.source === "manual" && "border-dashed",
            )}
            onClick={() => onOpenPunch(punch)}
          >
            <span className="text-[0.625rem] text-muted-foreground leading-tight">
              {label ?? "Desconsiderada"}
            </span>
            <span className="inline-flex items-center gap-1 text-sm">
              {formatClockTime(punch.localTime)}
              {punch.isNextDay && <sup className="text-[0.625rem]">+1</sup>}
              {punch.source === "manual" && (
                <PenLine aria-label="ajuste" className="size-3" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
