"use server";

import {
  hasModuleAccess,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OperatorId } from "@/features/operators/types";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { fromSelectFieldValue } from "@/lib/optional-select-value";
import { createClient } from "@/lib/supabase/server";
import { getProcessTemplate } from "./process-templates";
import {
  type NewTaskInput,
  newTaskSchema,
  type TaskInput,
  type TaskListInput,
  taskListSchema,
  taskSchema,
} from "./schemas";
import { getPeriodOrder } from "./task-periods";
import { getPeriodStart } from "./task-schedule";
import type {
  TaskBoard,
  TaskId,
  TaskListId,
  TaskPeriod,
  TemperatureRecord,
} from "./types";

const FORBIDDEN_MESSAGE = "Só o dono ou um gerente pode editar as listas.";
const COMPLETIONS_LOOKBACK_IN_DAYS = 31;
const TEMPERATURE_LOG_DAYS = 30;
const TEMPERATURE_LOG_LIMIT = 1000;

function toTaskPeriod(value: string | undefined): TaskPeriod | null {
  return (fromSelectFieldValue(value) as TaskPeriod | undefined) ?? null;
}

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
  if (todayError)
    return databaseFailure("Não foi possível carregar as tarefas.", todayError);

  const [listsResult, completionsResult] = await Promise.all([
    supabase
      .from("task_lists")
      .select(
        "id, name, period, position, created_at, tasks(id, title, kind, instructions, min_temperature, max_temperature, position, created_at, frequency, due_weekday, due_day, assigned_operator_id, assignee:operators(name))",
      )
      .eq("organization_id", organizationId)
      .order("position")
      .order("created_at"),
    supabase
      .from("task_completions")
      .select(
        "task_id, period_start, completed_on, operator_name, completed_at, temperature",
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
        temperature: completion.temperature,
      },
    ]),
  );

  return actionSuccess({
    today,
    taskLists: [...listsResult.data]
      .sort(
        (first, second) =>
          getPeriodOrder(first.period) - getPeriodOrder(second.period) ||
          first.position - second.position ||
          first.created_at.localeCompare(second.created_at),
      )
      .map((list) => ({
        id: list.id as TaskListId,
        name: list.name,
        period: list.period,
        tasks: [...list.tasks]
          .sort(
            (first, second) =>
              first.position - second.position ||
              first.created_at.localeCompare(second.created_at),
          )
          .map((task) => ({
            id: task.id as TaskId,
            title: task.title,
            kind: task.kind,
            instructions: task.instructions,
            minTemperature: task.min_temperature,
            maxTemperature: task.max_temperature,
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
  if (!(await hasModuleAccess(organizationId, "tasks"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = taskListSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure("Informe o nome do processo.");

  const values = {
    name: parsedInput.data.name,
    period: toTaskPeriod(parsedInput.data.period),
  };
  const supabase = await createClient();
  const { data, error } = listId
    ? await supabase
        .from("task_lists")
        .update(values)
        .eq("id", listId)
        .eq("organization_id", organizationId)
        .select("id")
    : await supabase
        .from("task_lists")
        .insert({ ...values, organization_id: organizationId })
        .select("id");

  if (error) return databaseFailure("Não foi possível salvar a lista.", error);
  if (data.length === 0) return actionFailure(FORBIDDEN_MESSAGE);
  return actionSuccess();
}

export async function deleteTaskList(
  organizationId: OrganizationId,
  listId: TaskListId,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "tasks"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_lists")
    .delete()
    .eq("id", listId)
    .eq("organization_id", organizationId)
    .select("id");

  if (error) return databaseFailure("Não foi possível excluir a lista.", error);
  if (data.length === 0) return actionFailure(FORBIDDEN_MESSAGE);
  return actionSuccess();
}

export async function addTask(
  organizationId: OrganizationId,
  listId: TaskListId,
  input: NewTaskInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "tasks"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = newTaskSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure("Descreva a tarefa.");

  const supabase = await createClient();
  const { data: lastTask } = await supabase
    .from("tasks")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: organizationId,
      list_id: listId,
      title: parsedInput.data.title,
      position: (lastTask?.position ?? -1) + 1,
    })
    .select("id");

  if (error)
    return databaseFailure("Não foi possível adicionar a tarefa.", error);
  if (data.length === 0) return actionFailure(FORBIDDEN_MESSAGE);
  return actionSuccess();
}

export async function updateTask(
  organizationId: OrganizationId,
  taskId: TaskId,
  input: TaskInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "tasks"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = taskSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const {
    title,
    kind,
    instructions,
    minTemperature,
    maxTemperature,
    frequency,
    dueWeekday,
    dueDay,
    assignedOperatorId,
  } = parsedInput.data;
  const isTemperature = kind === "temperature";
  const weekday = fromSelectFieldValue(dueWeekday);
  const day = fromSelectFieldValue(dueDay);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({
      title,
      kind,
      instructions: instructions || null,
      min_temperature: isTemperature ? (minTemperature ?? null) : null,
      max_temperature: isTemperature ? (maxTemperature ?? null) : null,
      frequency,
      due_weekday: frequency === "weekly" && weekday ? Number(weekday) : null,
      due_day: frequency === "monthly" && day ? Number(day) : null,
      assigned_operator_id: fromSelectFieldValue(assignedOperatorId) ?? null,
    })
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .select("id");

  if (error) return databaseFailure("Não foi possível salvar a tarefa.", error);
  if (data.length === 0) return actionFailure(FORBIDDEN_MESSAGE);
  return actionSuccess();
}

export async function deleteTask(
  organizationId: OrganizationId,
  taskId: TaskId,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "tasks"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .select("id");

  if (error)
    return databaseFailure("Não foi possível excluir a tarefa.", error);
  if (data.length === 0) return actionFailure(FORBIDDEN_MESSAGE);
  return actionSuccess();
}

export async function setTaskDone(
  taskId: TaskId,
  isDone: boolean,
  temperature?: number,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_task_done", {
    p_task_id: taskId,
    p_is_done: isDone,
    p_temperature: temperature,
  });

  if (error)
    return databaseFailure("Não foi possível atualizar a tarefa.", error);
  return actionSuccess();
}

export async function addTaskListsFromTemplates(
  organizationId: OrganizationId,
  templateIds: readonly string[],
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "tasks"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const templates = templateIds.flatMap((templateId) => {
    const template = getProcessTemplate(templateId);
    return template ? [template] : [];
  });
  if (templates.length === 0) return actionFailure("Escolha um modelo.");

  const supabase = await createClient();
  for (const template of templates) {
    const { data: list, error: listError } = await supabase
      .from("task_lists")
      .insert({
        organization_id: organizationId,
        name: template.name,
        period: template.period,
      })
      .select("id")
      .single();
    if (listError) {
      return databaseFailure("Não foi possível adicionar o modelo.", listError);
    }

    const { error: tasksError } = await supabase.from("tasks").insert(
      template.tasks.map((task, index) => ({
        organization_id: organizationId,
        list_id: list.id,
        title: task.title,
        position: index,
        kind: task.kind ?? "check",
        instructions: task.instructions ?? null,
        min_temperature: task.minTemperature ?? null,
        max_temperature: task.maxTemperature ?? null,
        frequency: task.frequency ?? "daily",
        due_weekday: task.dueWeekday ?? null,
        due_day: task.dueDay ?? null,
      })),
    );
    if (tasksError) {
      return databaseFailure(
        "Não foi possível adicionar o modelo.",
        tasksError,
      );
    }
  }
  return actionSuccess();
}

export async function listTemperatureRecords(
  organizationId: OrganizationId,
): Promise<ActionResult<TemperatureRecord[]>> {
  if (!(await hasModuleAccess(organizationId, "tasks"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const supabase = await createClient();
  const { data: today, error: todayError } = await supabase.rpc(
    "organization_today",
    { p_organization_id: organizationId },
  );
  if (todayError) {
    return databaseFailure(
      "Não foi possível carregar as temperaturas.",
      todayError,
    );
  }

  const { data, error } = await supabase
    .from("task_completions")
    .select(
      "id, temperature, completed_on, completed_at, operator_name, task:tasks(title, min_temperature, max_temperature, list:task_lists(name))",
    )
    .eq("organization_id", organizationId)
    .not("temperature", "is", null)
    .gte("completed_on", subtractDays(today, TEMPERATURE_LOG_DAYS))
    .order("completed_at", { ascending: false })
    .limit(TEMPERATURE_LOG_LIMIT);

  if (error) {
    return databaseFailure("Não foi possível carregar as temperaturas.", error);
  }

  return actionSuccess(
    data.flatMap((record) =>
      record.temperature !== null && record.task
        ? [
            {
              id: record.id,
              taskTitle: record.task.title,
              listName: record.task.list?.name ?? "",
              temperature: record.temperature,
              minTemperature: record.task.min_temperature,
              maxTemperature: record.task.max_temperature,
              completedOn: record.completed_on,
              completedAt: record.completed_at,
              operatorName: record.operator_name,
            },
          ]
        : [],
    ),
  );
}
