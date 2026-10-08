"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, Flag, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { DateField } from "@/components/form/date-field";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useAddNationalHolidaysMutation } from "@/features/employees/hooks/use-add-national-holidays-mutation";
import { useDeleteHolidayMutation } from "@/features/employees/hooks/use-delete-holiday-mutation";
import { useHolidaysQuery } from "@/features/employees/hooks/use-holidays-query";
import { useSaveHolidayMutation } from "@/features/employees/hooks/use-save-holiday-mutation";
import { type HolidayInput, holidaySchema } from "@/features/employees/schemas";
import { getWeekdayShortLabel } from "@/features/employees/work-schedule-labels";
import type { OrganizationId } from "@/features/organizations/types";
import { getIsoWeekday } from "@/features/time-clock/time-utils";
import { formatDateKey } from "@/lib/format";

const EMPTY_HOLIDAY_FORM: HolidayInput = { date: "", name: "" };

type HolidaysDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  initialYear: number;
  onClose: () => void;
};

export function HolidaysDialog({
  organizationId,
  isOpen,
  initialYear,
  onClose,
}: HolidaysDialogProps) {
  const [year, setYear] = useState(initialYear);
  const holidaysQuery = useHolidaysQuery(organizationId, year);
  const saveMutation = useSaveHolidayMutation(organizationId);
  const addNationalMutation = useAddNationalHolidaysMutation(organizationId);
  const deleteMutation = useDeleteHolidayMutation(organizationId);
  const form = useForm<HolidayInput>({
    resolver: zodResolver(holidaySchema),
    defaultValues: EMPTY_HOLIDAY_FORM,
  });

  const handleSubmit = form.handleSubmit((values) =>
    saveMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Feriado adicionado.");
        form.reset(EMPTY_HOLIDAY_FORM);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function addNationalHolidays() {
    addNationalMutation.mutate(year, {
      onSuccess: () =>
        toast.success(`Feriados nacionais de ${year} adicionados.`),
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <DetailsDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Feriados"
      footer={
        <>
          <DialogClose
            render={
              <Button
                variant="outline"
                className={DIALOG_ACTION_BUTTON_CLASS_NAME}
              />
            }
          >
            Fechar
          </DialogClose>
          <Button
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            isLoading={addNationalMutation.isPending}
            onClick={addNationalHolidays}
          >
            <Flag aria-hidden />
            Nacionais de {year}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-muted-foreground text-sm">
          Trabalho em feriado conta como hora extra 100%. Adicione também os
          feriados estaduais e municipais da sua cidade.
        </p>

        <div className="flex items-center justify-between rounded-lg border px-2 py-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Ano anterior"
            onClick={() => setYear((currentYear) => currentYear - 1)}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <span className="font-semibold tabular-nums">{year}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Próximo ano"
            onClick={() => setYear((currentYear) => currentYear + 1)}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="grid grid-cols-[1fr_1fr_auto] items-start gap-2"
        >
          <DateField
            control={form.control}
            name="date"
            label="Data"
            isLabelHidden
          />
          <TextField
            control={form.control}
            name="name"
            label="Nome do feriado"
            isLabelHidden
            placeholder="Ex.: Aniversário da cidade"
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            className="size-12"
            aria-label="Adicionar feriado"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Spinner aria-hidden />
            ) : (
              <Plus aria-hidden />
            )}
          </Button>
        </form>

        {!holidaysQuery.data ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        ) : holidaysQuery.data.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground text-sm">
            Nenhum feriado em {year}.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border">
            {holidaysQuery.data.map((holiday) => (
              <li
                key={holiday.id}
                className="flex items-center gap-3 px-3 py-2"
              >
                <span className="w-24 shrink-0 text-muted-foreground text-sm tabular-nums">
                  {formatDateKey(holiday.date)}{" "}
                  <span className="text-xs">
                    {getWeekdayShortLabel(getIsoWeekday(holiday.date))}
                  </span>
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {holiday.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Excluir ${holiday.name}`}
                  className="text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() =>
                    deleteMutation.mutate(holiday.id, {
                      onError: (error) => toast.error(error.message),
                    })
                  }
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DetailsDialog>
  );
}
