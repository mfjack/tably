"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import type { OrganizationId } from "@/features/organizations/types";
import { useSaveTaskListMutation } from "@/features/tasks/hooks/use-save-task-list-mutation";
import { type TaskListInput, taskListSchema } from "@/features/tasks/schemas";
import { TASK_PERIOD_OPTIONS } from "@/features/tasks/task-periods";
import type { TaskList } from "@/features/tasks/types";
import {
  NONE_SELECT_VALUE,
  toSelectFieldValue,
} from "@/lib/optional-select-value";

const EMPTY_TASK_LIST_FORM: TaskListInput = {
  name: "",
  period: NONE_SELECT_VALUE,
};

type TaskListFormDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  taskList?: TaskList;
  onClose: () => void;
};

export function TaskListFormDialog({
  organizationId,
  isOpen,
  taskList,
  onClose,
}: TaskListFormDialogProps) {
  const saveTaskListMutation = useSaveTaskListMutation(organizationId);
  const form = useForm<TaskListInput>({
    resolver: zodResolver(taskListSchema),
    defaultValues: EMPTY_TASK_LIST_FORM,
  });
  const isEditing = taskList !== undefined;

  useEffect(() => {
    if (!isOpen) return;
    form.reset(
      taskList
        ? { name: taskList.name, period: toSelectFieldValue(taskList.period) }
        : EMPTY_TASK_LIST_FORM,
    );
    saveTaskListMutation.reset();
  }, [isOpen, taskList, form, saveTaskListMutation.reset]);

  const handleSubmit = form.handleSubmit((values) =>
    saveTaskListMutation.mutate(
      { listId: taskList?.id ?? null, input: values },
      {
        onSuccess: () => {
          toast.success(isEditing ? "Processo salvo." : "Processo criado.");
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
      title={isEditing ? "Editar processo" : "Novo processo"}
      description="Um checklist da rotina, como a abertura ou a limpeza. Os itens se repetem e qualquer pessoa da equipe pode marcar."
      submitLabel={isEditing ? "Salvar" : "Criar processo"}
      isSubmitting={saveTaskListMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          label="Nome do processo"
          placeholder="Ex.: Abertura da loja"
          autoComplete="off"
        />
        <SelectField
          control={form.control}
          name="period"
          label="Turno"
          options={TASK_PERIOD_OPTIONS}
          description="Os processos aparecem na ordem do dia: abertura, expediente, fechamento."
        />
      </FieldGroup>
    </FormDialog>
  );
}
