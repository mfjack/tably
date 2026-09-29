"use server";

import type { OperatorId } from "@/features/operators/types";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { fromSelectFieldValue } from "@/lib/optional-select-value";
import { createClient } from "@/lib/supabase/server";
import {
  type NewTaskInput,
  newTaskSchema,
  type TaskInput,
  type TaskListInput,
  taskListSchema,
  taskSchema,
} from "./schemas";
import { getPeriodStart } from "./task-schedule";
import type { TaskBoard, TaskId, TaskListId } from "./types";

const FORBIDDEN_MESSAGE = "Só o dono ou um gerente pode editar as listas.";
const COMPLETIONS_LOOKBACK_IN_DAYS = 31;

function subtractDays(date: string, days: number) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - days);
  return day.toISOString().slice(0, 10);
}

export async function listTaskLists(
  organizationId: OrganizationId,
): Promise<ActionResult<TaskBoard>> {
  const supabase = await createClient();
  const { data: today, error: todayError } = await supabase.rpc(
    "organization_today",
    { p_organization_id: organizationId },
  );
  if (todayError) return actionFailure("Não foi possível carregar as tarefas.");

  const [listsResult, completionsResult] = await Promise.all([
    supabase
      .from("task_lists")
      .select(
        "id, name, position, tasks(id, title, position, created_at, frequency, due_weekday, due_day, assigned_operator_id, assignee:operators(name))",
      )
      .eq("organization_id", organizationId)
      .order("position")
      .order("created_at"),
    supabase
      .from("task_completions")
      .select(
        "task_id, period_start, completed_on, operator_name, completed_at",
      )
      .eq("organization_id", organizationId)
      .gte("period_start", subtractDays(today, COMPLETIONS_LOOKBACK_IN_DAYS)),
  ]);

  if (listsResult.error || completionsResult.error) {
    return actionFailure("Não foi possível carregar as tarefas.");
  }

  const completionsByKey = new Map(
    completionsResult.data.map((completion) => [
      `${completion.task_id}:${completion.period_start}`,
      {
        operatorName: completion.operator_name,
        completedAt: completion.completed_at,
        completedOn: completion.completed_on,
      },
    ]),
  );

  return actionSuccess({
    today,
    taskLists: listsResult.data.map((list) => ({
      id: list.id as TaskListId,
      name: list.name,
      tasks: [...list.tasks]
        .sort(
          (first, second) =>
            first.position - second.position ||
            first.created_at.localeCompare(second.created_at),
        )
        .map((task) => ({
          id: task.id as TaskId,
          title: task.title,
          frequency: task.frequency,
          dueWeekday: task.due_weekday,
          dueDay: task.due_day,
          assignee:
            task.assigned_operator_id && task.assignee
              ? {
                  id: task.assigned_operator_id as OperatorId,
                  name: task.assignee.name,
                }
              : null,
          completion:
            completionsByKey.get(
              `${task.id}:${getPeriodStart(task.frequency, today)}`,
            ) ?? null,
        })),
    })),
  });
}

export async function saveTaskList(
  organizationId: OrganizationId,
  listId: TaskListId | null,
  input: TaskListInput,
): Promise<ActionResult> {
  const parsedInput = taskListSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure("Informe o nome da lista.");

  const supabase = await createClient();
  const { data, error } = listId
    ? await supabase
        .from("task_lists")
        .update({ name: parsedInput.data.name })
        .eq("id", listId)
        .eq("organization_id", organizationId)
        .select("id")
    : await supabase
        .from("task_lists")
        .insert({
          organization_id: organizationId,
          name: parsedInput.data.name,
        })
        .select("id");

  if (error) return actionFailure("Não foi possível salvar a lista.");
  if (data.length === 0) return actionFailure(FORBIDDEN_MESSAGE);
  return actionSuccess();
}

export async function deleteTaskList(
  organizationId: OrganizationId,
  listId: TaskListId,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_lists")
    .delete()
    .eq("id", listId)
    .eq("organization_id", organizationId)
    .select("id");

  if (error) return actionFailure("Não foi possível excluir a lista.");
  if (data.length === 0) return actionFailure(FORBIDDEN_MESSAGE);
  return actionSuccess();
}

export async function addTask(
  organizationId: OrganizationId,
  listId: TaskListId,
  input: NewTaskInput,
): Promise<ActionResult> {
  const parsedInput = newTaskSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure("Descreva a tarefa.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: organizationId,
      list_id: listId,
      title: parsedInput.data.title,
    })
    .select("id");

  if (error) return actionFailure("Não foi possível adicionar a tarefa.");
  if (data.length === 0) return actionFailure(FORBIDDEN_MESSAGE);
  return actionSuccess();
}

export async function updateTask(
  organizationId: OrganizationId,
  taskId: TaskId,
  input: TaskInput,
): Promise<ActionResult> {
  const parsedInput = taskSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const { title, frequency, dueWeekday, dueDay, assignedOperatorId } =
    parsedInput.data;
  const weekday = fromSelectFieldValue(dueWeekday);
  const day = fromSelectFieldValue(dueDay);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({
      title,
      frequency,
      due_weekday: frequency === "weekly" && weekday ? Number(weekday) : null,
      due_day: frequency === "monthly" && day ? Number(day) : null,
      assigned_operator_id: fromSelectFieldValue(assignedOperatorId) ?? null,
    })
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .select("id");

  if (error) return actionFailure("Não foi possível salvar a tarefa.");
  if (data.length === 0) return actionFailure(FORBIDDEN_MESSAGE);
  return actionSuccess();
}

export async function deleteTask(
  organizationId: OrganizationId,
  taskId: TaskId,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .select("id");

  if (error) return actionFailure("Não foi possível excluir a tarefa.");
  if (data.length === 0) return actionFailure(FORBIDDEN_MESSAGE);
  return actionSuccess();
}

export async function setTaskDone(
  taskId: TaskId,
  isDone: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_task_done", {
    p_task_id: taskId,
    p_is_done: isDone,
  });

  if (error) return actionFailure("Não foi possível atualizar a tarefa.");
  return actionSuccess();
}
