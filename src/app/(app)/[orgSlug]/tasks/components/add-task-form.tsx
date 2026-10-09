"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { OrganizationId } from "@/features/organizations/types";
import { useAddTaskMutation } from "@/features/tasks/hooks/use-add-task-mutation";
import { type NewTaskInput, newTaskSchema } from "@/features/tasks/schemas";
import type { TaskListId } from "@/features/tasks/types";

type AddTaskFormProps = {
  organizationId: OrganizationId;
  listId: TaskListId;
  listName: string;
};

export function AddTaskForm({
  organizationId,
  listId,
  listName,
}: AddTaskFormProps) {
  const addTaskMutation = useAddTaskMutation(organizationId);
  const form = useForm<NewTaskInput>({
    resolver: zodResolver(newTaskSchema),
    defaultValues: { title: "" },
  });

  const handleSubmit = form.handleSubmit((values) =>
    addTaskMutation.mutate(
      { listId, input: values },
      {
        onSuccess: () => form.reset({ title: "" }),
        onError: (error) => toast.error(error.message),
      },
    ),
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex gap-2">
      <Input
        {...form.register("title")}
        aria-label={`Novo item em ${listName}`}
        placeholder="Adicionar item"
        autoComplete="off"
        className="h-9 rounded-lg bg-muted text-sm"
      />
      <Button
        type="submit"
        variant="outline"
        size="icon"
        className="size-9 shrink-0"
        aria-label="Adicionar item"
        disabled={addTaskMutation.isPending}
      >
        {addTaskMutation.isPending ? (
          <Spinner aria-hidden />
        ) : (
          <Plus aria-hidden />
        )}
      </Button>
    </form>
  );
}
