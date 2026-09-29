"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import type { OrganizationId } from "@/features/organizations/types";
import { useSaveTaskListMutation } from "@/features/tasks/hooks/use-save-task-list-mutation";
import { type TaskListInput, taskListSchema } from "@/features/tasks/schemas";
import type { TaskList } from "@/features/tasks/types";

const EMPTY_TASK_LIST_FORM: TaskListInput = { name: "" };

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
    form.reset(taskList ? { name: taskList.name } : EMPTY_TASK_LIST_FORM);
    saveTaskListMutation.reset();
  }, [isOpen, taskList, form, saveTaskListMutation.reset]);

  const handleSubmit = form.handleSubmit((values) =>
    saveTaskListMutation.mutate(
      { listId: taskList?.id ?? null, input: values },
      {
        onSuccess: () => {
          toast.success(isEditing ? "Lista renomeada." : "Lista criada.");
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
      title={isEditing ? "Renomear lista" : "Nova lista"}
      description="As tarefas se repetem todo dia e podem ser marcadas por qualquer pessoa da equipe."
      submitLabel={isEditing ? "Salvar" : "Criar lista"}
      isSubmitting={saveTaskListMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          label="Nome da lista"
          placeholder="Ex.: Abertura da loja"
          autoComplete="off"
        />
      </FieldGroup>
    </FormDialog>
  );
}
