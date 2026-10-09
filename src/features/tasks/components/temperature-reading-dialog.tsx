"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldGroup } from "@/components/ui/field";
import {
  type TemperatureReadingInput,
  temperatureReadingSchema,
} from "@/features/tasks/schemas";
import {
  describeTemperatureRange,
  isTemperatureOutOfRange,
} from "@/features/tasks/task-temperature";
import type { TemperatureTask } from "@/features/tasks/types";

type TemperatureReadingDialogProps = {
  task: TemperatureTask | null;
  isSubmitting: boolean;
  onSubmit: (task: TemperatureTask, temperature: number) => void;
  onClose: () => void;
};

export function TemperatureReadingDialog({
  task,
  isSubmitting,
  onSubmit,
  onClose,
}: TemperatureReadingDialogProps) {
  const form = useForm<TemperatureReadingInput>({
    resolver: zodResolver(temperatureReadingSchema),
    defaultValues: { temperature: undefined },
  });
  const temperature = useWatch({ control: form.control, name: "temperature" });
  const isOutOfRange =
    task !== null &&
    temperature !== undefined &&
    isTemperatureOutOfRange(temperature, task);

  useEffect(() => {
    if (task) form.reset({ temperature: undefined });
  }, [task, form]);

  const handleSubmit = form.handleSubmit((values) => {
    if (task && values.temperature !== undefined) {
      onSubmit(task, values.temperature);
    }
  });

  return (
    <FormDialog
      isOpen={task !== null}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={task?.title ?? "Registrar temperatura"}
      description={
        task
          ? `Limite: ${describeTemperatureRange(task)}. Anote o valor que o termômetro mostra agora.`
          : undefined
      }
      submitLabel="Registrar"
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <NumberField
          control={form.control}
          name="temperature"
          label="Temperatura medida"
          format="temperature"
          suffix="°C"
          placeholder="Ex.: 4"
          allowsNegative
        />
        {isOutOfRange && (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertDescription>
              Fora do limite. Registre assim mesmo e avise o responsável na
              hora: confira a porta, o termostato e se os alimentos continuam
              seguros.
            </AlertDescription>
          </Alert>
        )}
        {task?.instructions && (
          <p className="text-muted-foreground text-sm">{task.instructions}</p>
        )}
      </FieldGroup>
    </FormDialog>
  );
}
