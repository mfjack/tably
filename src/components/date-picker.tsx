"use client";

import { format, parseISO } from "date-fns";
import { ptBR as dateFnsPtBR } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { type Ref, useState } from "react";
import { ptBR } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { capitalize } from "@/lib/format-date";
import { cn } from "@/lib/utils";

const DATE_KEY_FORMAT = "yyyy-MM-dd";
const DISPLAY_FORMAT = "dd/MM/yyyy";
const FIRST_SELECTABLE_YEAR = 1940;
const YEARS_AHEAD = 10;

type DatePickerProps = {
  id?: string;
  value: string;
  placeholder: string;
  className: string;
  isInvalid?: boolean;
  describedBy?: string;
  triggerRef?: Ref<HTMLButtonElement>;
  onChange: (value: string) => void;
  onBlur?: () => void;
};

const CALENDAR_FORMATTERS = {
  formatWeekdayName: (date: Date) =>
    capitalize(format(date, "EEEE", { locale: dateFnsPtBR }).slice(0, 3)),
  formatMonthDropdown: (date: Date) =>
    capitalize(format(date, "MMM", { locale: dateFnsPtBR })),
};

function toDate(value: string): Date | undefined {
  return value ? parseISO(value) : undefined;
}

export function DatePicker({
  id,
  value,
  placeholder,
  className,
  isInvalid = false,
  describedBy,
  triggerRef,
  onChange,
  onBlur,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = toDate(value);
  const today = new Date();

  function changeOpen(isPopoverOpen: boolean) {
    setIsOpen(isPopoverOpen);
    if (!isPopoverOpen) onBlur?.();
  }

  function selectDate(date: Date | undefined) {
    onChange(date ? format(date, DATE_KEY_FORMAT) : "");
    setIsOpen(false);
  }

  function clearDate() {
    onChange("");
    setIsOpen(false);
  }

  return (
    <Popover open={isOpen} onOpenChange={changeOpen}>
      <PopoverTrigger
        render={
          <button
            ref={triggerRef}
            id={id}
            type="button"
            aria-invalid={isInvalid}
            aria-describedby={describedBy}
            className={cn(
              className,
              "flex w-full items-center justify-between gap-2 text-left",
              !selectedDate && "text-muted-foreground",
            )}
          />
        }
      >
        <span className="truncate tabular-nums">
          {selectedDate ? format(selectedDate, DISPLAY_FORMAT) : placeholder}
        </span>
        <CalendarDays aria-hidden className="size-4 shrink-0 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={ptBR}
          className="[--cell-size:--spacing(9)]"
          formatters={CALENDAR_FORMATTERS}
          selected={selectedDate}
          defaultMonth={selectedDate ?? today}
          captionLayout="dropdown"
          startMonth={new Date(FIRST_SELECTABLE_YEAR, 0)}
          endMonth={new Date(today.getFullYear() + YEARS_AHEAD, 11)}
          onSelect={selectDate}
        />
        <div className="flex justify-between gap-2 border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!selectedDate}
            onClick={clearDate}
          >
            Limpar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => selectDate(today)}
          >
            Hoje
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
