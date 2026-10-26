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
import { getWeekdayLabel, ISO_WEEKDAYS } from "@/lib/weekdays";
import { SettingsFormSection } from "./settings-form-section";

type OpeningHoursFormProps = {
  organization: UserOrganization;
};

function toFormValues(organization: UserOrganization): OpeningHoursFormInput {
  return { days: toOpeningDays(organization.openingHours) };
}

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
      description="Dias e horários em que o café abre. Se fecha para o almoço, preencha a pausa; se não, deixe em branco. O cardápio digital mostra se está aberto e só aceita pedidos nesse horário."
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
        <ul className="flex flex-col gap-2">
          {ISO_WEEKDAYS.map((weekday, index) => {
            const isOpen = days[index]?.isOpen ?? false;
            const switchId = `${switchIdPrefix}-${weekday}`;
            return (
              <li
                key={weekday}
                className="grid gap-2 rounded-lg border p-3 md:grid-cols-[8rem_1fr] md:items-end"
              >
                <Controller
                  control={form.control}
                  name={`days.${index}.isOpen`}
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
                {isOpen ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <TextField
                      control={form.control}
                      name={`days.${index}.opensAt`}
                      label="Abre"
                      type="time"
                    />
                    <TextField
                      control={form.control}
                      name={`days.${index}.breakStartsAt`}
                      label="Fecha p/ almoço"
                      type="time"
                    />
                    <TextField
                      control={form.control}
                      name={`days.${index}.breakEndsAt`}
                      label="Reabre"
                      type="time"
                    />
                    <TextField
                      control={form.control}
                      name={`days.${index}.closesAt`}
                      label="Fecha"
                      type="time"
                    />
                  </div>
                ) : (
                  <p className="flex h-12 items-center text-muted-foreground text-sm">
                    Fechado
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </SettingsFormSection>
  );
}
