"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import type { OperatorSummary } from "@/features/operators/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useUpdateTaskMutation } from "@/features/tasks/hooks/use-update-task-mutation";
import { type TaskInput, taskSchema } from "@/features/tasks/schemas";
import {
  TASK_FREQUENCY_LABELS,
  WEEKDAY_OPTIONS,
} from "@/features/tasks/task-schedule";
import type { Task } from "@/features/tasks/types";
import {
  NONE_SELECT_VALUE,
  toSelectFieldValue,
} from "@/lib/optional-select-value";

const FREQUENCY_OPTIONS = Object.entries(TASK_FREQUENCY_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const DAYS_OF_MONTH = 31;

const DAY_OPTIONS = [
  { value: NONE_SELECT_VALUE, label: "Qualquer dia do mês" },
  ...Array.from({ length: DAYS_OF_MONTH }, (_, index) => ({
    value: (index + 1).toString(),
    label: `Dia ${index + 1}`,
  })),
];

const WEEKDAY_SELECT_OPTIONS = [
  { value: NONE_SELECT_VALUE, label: "Qualquer dia da semana" },
  ...WEEKDAY_OPTIONS,
];

type TaskFormDialogProps = {
  organizationId: OrganizationId;
  task: Task | null;
  operators: readonly OperatorSummary[];
  onClose: () => void;
};

function toFormValues(task: Task): DefaultValues<TaskInput> {
  return {
    title: task.title,
    frequency: task.frequency,
    dueWeekday: toSelectFieldValue(task.dueWeekday?.toString() ?? null),
    dueDay: toSelectFieldValue(task.dueDay?.toString() ?? null),
    assignedOperatorId: toSelectFieldValue(task.assignee?.id ?? null),
  };
}

export function TaskFormDialog({
  organizationId,
  task,
  operators,
  onClose,
}: TaskFormDialogProps) {
  const updateTaskMutation = useUpdateTaskMutation(organizationId);
  const form = useForm<TaskInput>({ resolver: zodResolver(taskSchema) });
  const frequency = useWatch({ control: form.control, name: "frequency" });

  useEffect(() => {
    if (!task) return;
    form.reset(toFormValues(task));
    updateTaskMutation.reset();
  }, [task, form, updateTaskMutation.reset]);

  const handleSubmit = form.handleSubmit((values) => {
    if (!task) return;
    updateTaskMutation.mutate(
      { taskId: task.id, input: values },
      {
        onSuccess: () => {
          toast.success("Tarefa atualizada.");
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  });

  return (
    <FormDialog
      isOpen={task !== null}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Editar tarefa"
      description="Tarefas semanais e mensais podem ser feitas qualquer dia do período. Com um dia definido, ficam atrasadas depois dele."
      submitLabel="Salvar"
      isSubmitting={updateTaskMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="title"
          label="Tarefa"
          placeholder="Ex.: Limpar o moedor"
          autoComplete="off"
        />
        <SelectField
          control={form.control}
          name="frequency"
          label="Frequência"
          options={FREQUENCY_OPTIONS}
        />
        {frequency === "weekly" && (
          <SelectField
            control={form.control}
            name="dueWeekday"
            label="Dia da semana"
            options={WEEKDAY_SELECT_OPTIONS}
          />
        )}
        {frequency === "monthly" && (
          <SelectField
            control={form.control}
            name="dueDay"
            label="Dia do mês"
            options={DAY_OPTIONS}
          />
        )}
        {operators.length > 0 && (
          <SelectField
            control={form.control}
            name="assignedOperatorId"
            label="Responsável"
            options={[
              { value: NONE_SELECT_VALUE, label: "Qualquer pessoa" },
              ...operators.map((operator) => ({
                value: operator.id,
                label: operator.name,
              })),
            ]}
          />
        )}
      </FieldGroup>
    </FormDialog>
  );
}
