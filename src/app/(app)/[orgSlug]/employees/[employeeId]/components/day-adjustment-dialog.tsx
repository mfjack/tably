"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type FormEvent, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import { FieldError, FieldGroup } from "@/components/ui/field";
import type { EmployeeId } from "@/features/employees/types";
import type { OrganizationId } from "@/features/organizations/types";
import {
  getMissingSlots,
  getValidPunches,
  isNextDayTime,
} from "@/features/time-clock/day-adjustment";
import { useAddDayPunchesMutation } from "@/features/time-clock/hooks/use-add-day-punches-mutation";
import {
  type DayAdjustmentFormInput,
  dayAdjustmentFormSchema,
} from "@/features/time-clock/schemas";
import { formatClockTime } from "@/features/time-clock/time-utils";
import type {
  TimesheetDay,
  TimesheetPunch,
} from "@/features/time-clock/timesheet";
import { DayPunchList } from "./day-punch-list";

type DayAdjustmentDialogProps = {
  organizationId: OrganizationId;
  employeeId: EmployeeId;
  day: TimesheetDay | null;
  onOpenPunch: (punch: TimesheetPunch) => void;
  onClose: () => void;
};

function formatDayLabel(date: string) {
  const [, month, dayOfMonth] = date.split("-");
  return `${dayOfMonth}/${month}`;
}

export function DayAdjustmentDialog({
  organizationId,
  employeeId,
  day,
  onOpenPunch,
  onClose,
}: DayAdjustmentDialogProps) {
  const addMutation = useAddDayPunchesMutation(organizationId);
  const [missingSlots] = useState(() => (day ? getMissingSlots(day) : []));
  const form = useForm<DayAdjustmentFormInput>({
    resolver: zodResolver(dayAdjustmentFormSchema),
    defaultValues: {
      times: missingSlots.map(() => ({ value: "" })),
      reason: "",
    },
  });
  const { fields } = useFieldArray({
    control: form.control,
    name: "times",
  });
  const isDayComplete = missingSlots.length === 0;

  const submitForm = form.handleSubmit(({ times, reason }) => {
    if (!day) return;
    const filledTimes = times
      .map((time) => time.value)
      .filter((time) => time !== "");
    const dayTimes = [
      ...getValidPunches(day)
        .filter((punch) => !punch.isNextDay)
        .map((punch) => punch.localTime),
      ...filledTimes,
    ];

    addMutation.mutate(
      {
        employeeId,
        input: {
          workDate: day.date,
          punches: filledTimes.map((time) => ({
            time,
            isNextDay: isNextDayTime(time, day.schedule, dayTimes),
          })),
          reason,
        },
      },
      {
        onSuccess: () => {
          toast.success("Dia ajustado.");
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  });

  const timesError = form.formState.errors.times?.root?.message;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!isDayComplete) {
      void submitForm(event);
      return;
    }
    event.preventDefault();
    onClose();
  }

  return (
    <FormDialog
      isOpen={day !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={day ? `Ajustar ${formatDayLabel(day.date)}` : "Ajustar dia"}
      description={
        isDayComplete
          ? "Esse dia já tem as 4 marcações: entrada, saída para o intervalo, volta e saída."
          : "Preencha os horários que faltaram. Fica registrado com motivo, data e responsável."
      }
      submitLabel={isDayComplete ? "Fechar" : "Salvar"}
      isSubmitting={addMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <section className="flex flex-col gap-2">
          <h3 className="font-medium text-sm">Marcações do dia</h3>
          {day && day.punches.length > 0 ? (
            <DayPunchList punches={day.punches} onOpenPunch={onOpenPunch} />
          ) : (
            <p className="text-muted-foreground text-sm">
              Nenhuma marcação neste dia.
            </p>
          )}
          {day && day.punches.length > 0 && (
            <p className="text-muted-foreground text-xs">
              Toque numa marcação errada para desconsiderar.
            </p>
          )}
        </section>

        {!isDayComplete && (
          <div className="grid grid-cols-2 gap-4">
            {fields.map((field, index) => {
              const slot = missingSlots[index];
              return (
                <TextField
                  key={field.id}
                  control={form.control}
                  name={`times.${index}.value`}
                  label={slot.label}
                  description={
                    slot?.expectedTime
                      ? `Previsto ${formatClockTime(slot.expectedTime)}`
                      : undefined
                  }
                  type="time"
                />
              );
            })}
          </div>
        )}
        {timesError && <FieldError>{timesError}</FieldError>}
        {!isDayComplete && (
          <TextareaField
            control={form.control}
            name="reason"
            label="Motivo"
            placeholder="Ex.: Esqueceu de bater a saída, confirmado pelo gerente"
          />
        )}
      </FieldGroup>
    </FormDialog>
  );
}
