"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUpdateOpeningHoursMutation } from "@/features/organizations/hooks/use-update-opening-hours-mutation";
import { toOpeningDays } from "@/features/organizations/opening-hours";
import {
  type OpeningHoursFormInput,
  openingHoursFormSchema,
} from "@/features/organizations/schemas";
import type { UserOrganization } from "@/features/organizations/types";
import { cn } from "@/lib/utils";
import { getWeekdayLabel, ISO_WEEKDAYS } from "@/lib/weekdays";
import { SettingsFormSection } from "./settings-form-section";

type OpeningHoursFormProps = {
  organization: UserOrganization;
};

function toFormValues(organization: UserOrganization): OpeningHoursFormInput {
  return { days: toOpeningDays(organization.openingHours) };
}

const DAYS_GRID_CLASS_NAME =
  "md:grid-cols-[9rem_repeat(4,minmax(0,1fr))] md:gap-3";

const OPENING_TIME_FIELDS = [
  { key: "opensAt", label: "Abre" },
  { key: "breakStartsAt", label: "Almoço" },
  { key: "breakEndsAt", label: "Volta" },
  { key: "closesAt", label: "Fecha" },
] as const;

export function OpeningHoursForm({ organization }: OpeningHoursFormProps) {
  const router = useRouter();
  const switchIdPrefix = useId();
  const updateHoursMutation = useUpdateOpeningHoursMutation(organization.id);
  const form = useForm<OpeningHoursFormInput>({
    resolver: zodResolver(openingHoursFormSchema),
    defaultValues: toFormValues(organization),
  });
  const days = useWatch({ control: form.control, name: "days" });

  function copyFirstOpenDay() {
    const firstOpenDay = days.find(
      (day) => day.isOpen && day.opensAt && day.closesAt,
    );
    if (!firstOpenDay) {
      toast.error("Preencha o horário de um dia aberto primeiro.");
      return;
    }
    form.setValue(
      "days",
      days.map((day) =>
        day.isOpen
          ? {
              ...day,
              opensAt: firstOpenDay.opensAt,
              breakStartsAt: firstOpenDay.breakStartsAt,
              breakEndsAt: firstOpenDay.breakEndsAt,
              closesAt: firstOpenDay.closesAt,
            }
          : day,
      ),
      { shouldDirty: true, shouldValidate: form.formState.isSubmitted },
    );
  }

  const handleSubmit = form.handleSubmit(
    (values) =>
      updateHoursMutation.mutate(values, {
        onSuccess: () => {
          form.reset(values);
          toast.success("Horários salvos.");
          router.refresh();
        },
        onError: (error) => toast.error(error.message),
      }),
    () => toast.error("Confira os horários destacados antes de salvar."),
  );

  return (
    <SettingsFormSection
      title="Funcionamento"
      description="Dias e horários em que o café abre. Se não fecha para o almoço, deixe Almoço e Volta em branco. O cardápio digital mostra se está aberto e só aceita pedidos nesse horário."
      isDirty={form.formState.isDirty}
      isSubmitting={updateHoursMutation.isPending}
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={copyFirstOpenDay}
          >
            <Copy aria-hidden />
            Copiar para os outros dias
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border">
          <div
            aria-hidden
            className={cn(
              "hidden border-b bg-muted/40 px-4 py-2 font-medium text-muted-foreground text-xs md:grid",
              DAYS_GRID_CLASS_NAME,
            )}
          >
            <span>Dia</span>
            {OPENING_TIME_FIELDS.map((timeField) => (
              <span key={timeField.key} className="text-center">
                {timeField.label}
              </span>
            ))}
          </div>
          <ul className="flex flex-col divide-y">
            {ISO_WEEKDAYS.map((weekday, index) => {
              const isOpen = days[index]?.isOpen ?? false;
              const switchId = `${switchIdPrefix}-${weekday}`;
              const dayLabel = getWeekdayLabel(weekday);
              return (
                <li
                  key={weekday}
                  className={cn(
                    "grid gap-3 px-4 py-3 md:items-start",
                    DAYS_GRID_CLASS_NAME,
                  )}
                >
                  <Controller
                    control={form.control}
                    name={`days.${index}.isOpen`}
                    render={({ field }) => (
                      <div className="flex h-9 items-center gap-2">
                        <Switch
                          id={switchId}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor={switchId}>{dayLabel}</Label>
                      </div>
                    )}
                  />
                  {isOpen ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:col-span-4 md:grid-cols-subgrid md:gap-3">
                      {OPENING_TIME_FIELDS.map((timeField) => (
                        <div
                          key={timeField.key}
                          className="flex flex-col gap-1"
                        >
                          <span className="text-muted-foreground text-xs md:hidden">
                            {timeField.label}
                          </span>
                          <TextField
                            control={form.control}
                            name={`days.${index}.${timeField.key}`}
                            label={`${dayLabel}: ${timeField.label}`}
                            isLabelHidden
                            type="time"
                            size="compact"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="flex h-9 items-center text-muted-foreground text-sm md:col-span-4">
                      Fechado
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </SettingsFormSection>
  );
}
