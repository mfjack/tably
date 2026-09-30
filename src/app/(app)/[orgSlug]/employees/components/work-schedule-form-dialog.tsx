"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy } from "lucide-react";
import { useEffect, useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSaveWorkScheduleMutation } from "@/features/employees/hooks/use-save-work-schedule-mutation";
import {
  DEFAULT_DAILY_TOLERANCE_MINUTES,
  DEFAULT_MARK_TOLERANCE_MINUTES,
  type WorkScheduleInput,
  workScheduleSchema,
} from "@/features/employees/schemas";
import type { WorkSchedule } from "@/features/employees/types";
import { getWeekdayLabel } from "@/features/employees/work-schedule-labels";
import type { OrganizationId } from "@/features/organizations/types";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

type WorkScheduleDayInput = WorkScheduleInput["days"][number];

function createEmptyDays(): WorkScheduleDayInput[] {
  return WEEKDAYS.map((weekday) => ({
    weekday,
    isWorkday: false,
    startTime: "",
    breakStartTime: "",
    breakEndTime: "",
    endTime: "",
  }));
}

function toFormValues(schedule: WorkSchedule | undefined): WorkScheduleInput {
  if (!schedule) {
    return {
      name: "",
      markToleranceMinutes: undefined,
      dailyToleranceMinutes: undefined,
      days: createEmptyDays(),
    };
  }
  const daysByWeekday = new Map(schedule.days.map((day) => [day.weekday, day]));
  return {
    name: schedule.name,
    markToleranceMinutes: schedule.markToleranceMinutes,
    dailyToleranceMinutes: schedule.dailyToleranceMinutes,
    days: WEEKDAYS.map((weekday) => {
      const day = daysByWeekday.get(weekday);
      return {
        weekday,
        isWorkday: day !== undefined,
        startTime: day?.startTime ?? "",
        breakStartTime: day?.breakStartTime ?? "",
        breakEndTime: day?.breakEndTime ?? "",
        endTime: day?.endTime ?? "",
      };
    }),
  };
}

type WorkScheduleFormDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  schedule?: WorkSchedule;
  onClose: () => void;
};

export function WorkScheduleFormDialog({
  organizationId,
  isOpen,
  schedule,
  onClose,
}: WorkScheduleFormDialogProps) {
  const saveMutation = useSaveWorkScheduleMutation(organizationId);
  const switchIdPrefix = useId();
  const form = useForm<WorkScheduleInput>({
    resolver: zodResolver(workScheduleSchema),
    defaultValues: toFormValues(undefined),
  });
  const days = useWatch({ control: form.control, name: "days" });
  const isEditing = schedule !== undefined;
  const daysError = form.formState.errors.days?.root?.message;

  useEffect(() => {
    if (!isOpen) return;
    form.reset(toFormValues(schedule));
    saveMutation.reset();
  }, [isOpen, schedule, form, saveMutation.reset]);

  function copyFirstWorkday() {
    const firstWorkday = days.find(
      (day) => day.isWorkday && day.startTime && day.endTime,
    );
    if (!firstWorkday) {
      toast.error("Preencha os horários de um dia primeiro.");
      return;
    }
    form.setValue(
      "days",
      days.map((day) =>
        day.isWorkday
          ? {
              ...day,
              startTime: firstWorkday.startTime,
              breakStartTime: firstWorkday.breakStartTime,
              breakEndTime: firstWorkday.breakEndTime,
              endTime: firstWorkday.endTime,
            }
          : day,
      ),
      { shouldValidate: form.formState.isSubmitted },
    );
  }

  const handleSubmit = form.handleSubmit((values) =>
    saveMutation.mutate(
      { workScheduleId: schedule?.id ?? null, input: values },
      {
        onSuccess: () => {
          toast.success(isEditing ? "Jornada atualizada." : "Jornada criada.");
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    ),
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={isEditing ? "Editar jornada" : "Nova jornada"}
      description="Horário contratual usado para calcular atrasos, faltas e horas extras."
      submitLabel={isEditing ? "Salvar" : "Criar jornada"}
      isSubmitting={saveMutation.isPending}
      onSubmit={handleSubmit}
      size="large"
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          label="Nome"
          placeholder="Ex.: Comercial 44h"
          autoComplete="off"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <NumberField
            control={form.control}
            name="markToleranceMinutes"
            label="Tolerância por marcação"
            description="A CLT desconsidera até 5 min por marcação."
            format="integer"
            suffix="min"
            placeholder={`Padrão: ${DEFAULT_MARK_TOLERANCE_MINUTES} min`}
          />
          <NumberField
            control={form.control}
            name="dailyToleranceMinutes"
            label="Tolerância por dia"
            description="E até 10 min somados no dia."
            format="integer"
            suffix="min"
            placeholder={`Padrão: ${DEFAULT_DAILY_TOLERANCE_MINUTES} min`}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-sm">Horários</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={copyFirstWorkday}
            >
              <Copy aria-hidden />
              Copiar para os outros dias
            </Button>
          </div>
          <ul className="flex flex-col gap-2">
            {WEEKDAYS.map((weekday, index) => {
              const isWorkday = days[index]?.isWorkday ?? false;
              const switchId = `${switchIdPrefix}-${weekday}`;
              return (
                <li
                  key={weekday}
                  className="grid gap-2 rounded-lg border p-3 md:grid-cols-[8rem_repeat(4,1fr)] md:items-end"
                >
                  <Controller
                    control={form.control}
                    name={`days.${index}.isWorkday`}
                    render={({ field }) => (
                      <div className="flex h-12 items-center gap-2">
                        <Switch
                          id={switchId}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor={switchId}>
                          {getWeekdayLabel(weekday)}
                        </Label>
                      </div>
                    )}
                  />
                  {isWorkday ? (
                    <div className="grid grid-cols-2 gap-2 md:col-span-4 md:grid-cols-4">
                      <TextField
                        control={form.control}
                        name={`days.${index}.startTime`}
                        label="Entrada"
                        type="time"
                      />
                      <TextField
                        control={form.control}
                        name={`days.${index}.breakStartTime`}
                        label="Início do intervalo"
                        type="time"
                      />
                      <TextField
                        control={form.control}
                        name={`days.${index}.breakEndTime`}
                        label="Fim do intervalo"
                        type="time"
                      />
                      <TextField
                        control={form.control}
                        name={`days.${index}.endTime`}
                        label="Saída"
                        type="time"
                      />
                    </div>
                  ) : (
                    <p className="flex h-12 items-center text-muted-foreground text-sm md:col-span-4">
                      Descanso
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {daysError && (
            <p role="alert" className="text-destructive text-sm">
              {daysError}
            </p>
          )}
        </div>
      </FieldGroup>
    </FormDialog>
  );
}
