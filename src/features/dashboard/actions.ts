"use server";

import { z } from "zod";
import type { EmployeeId } from "@/features/employees/types";
import { getAccessibleModuleIds } from "@/features/modules/require-visible-module";
import { getUserOrganizations } from "@/features/organizations/queries";
import type {
  AppModuleId,
  OrganizationId,
} from "@/features/organizations/types";
import { getVacationsOverview } from "@/features/payroll/extra-actions";
import { listTaskLists } from "@/features/tasks/actions";
import { getZonedParts, timeToMinutes } from "@/features/time-clock/time-utils";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import type { TeamMember, TeamMemberStatus, TodayDashboard } from "./types";

const LATE_TOLERANCE_MINUTES = 10;
const PENDING_TASKS_LIMIT = 6;

const numberSchema = z.coerce.number();

const dashboardSchema = z.object({
  today: z.string(),
  timeZone: z.string(),
  sales: z
    .object({
      revenue: numberSchema,
      orderCount: numberSchema,
      lastWeekRevenue: numberSchema,
      lastWeekOrderCount: numberSchema,
    })
    .optional(),
  openOrders: z.object({ count: numberSchema, total: numberSchema }).optional(),
  kitchen: z
    .object({ preparing: numberSchema, ready: numberSchema })
    .optional(),
  finance: z
    .object({
      overdueCount: numberSchema,
      overdueAmount: numberSchema,
      dueTodayCount: numberSchema,
      dueTodayAmount: numberSchema,
      receivableTodayAmount: numberSchema,
    })
    .optional(),
  stock: z
    .object({
      lowCount: numberSchema,
      items: z.array(
        z.object({
          name: z.string(),
          unit: z.enum(["unit", "g", "kg", "ml", "l"]),
          currentStock: numberSchema,
          minimumStock: numberSchema,
        }),
      ),
    })
    .optional(),
  team: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        expectedStart: z.string().nullable(),
        isOnTimeOff: z.boolean(),
        isHoliday: z.boolean(),
        punches: z.array(z.string()),
      }),
    )
    .optional(),
});

type RawTeamMember = NonNullable<
  z.infer<typeof dashboardSchema>["team"]
>[number];

function getTeamMemberStatus(
  member: RawTeamMember,
  nowMinutes: number,
): TeamMemberStatus {
  if (member.punches.length > 0) {
    return member.punches.length % 2 === 1 ? "working" : "finished";
  }
  if (member.isOnTimeOff || member.isHoliday || !member.expectedStart) {
    return "off";
  }
  return nowMinutes >
    timeToMinutes(member.expectedStart) + LATE_TOLERANCE_MINUTES
    ? "late"
    : "waiting";
}

function toTeamMembers(
  team: readonly RawTeamMember[],
  timeZone: string,
): TeamMember[] {
  const nowMinutes = getZonedParts(new Date().toISOString(), timeZone).minutes;
  return team.map((member) => {
    const lastPunch = member.punches[member.punches.length - 1];
    return {
      id: member.id as EmployeeId,
      name: member.name,
      status: getTeamMemberStatus(member, nowMinutes),
      expectedStart: member.expectedStart?.slice(0, 5) ?? null,
      lastPunchTime: lastPunch ? getZonedParts(lastPunch, timeZone).time : null,
      punchCount: member.punches.length,
    };
  });
}

export async function getTodayDashboard(
  organizationId: OrganizationId,
): Promise<ActionResult<TodayDashboard>> {
  const organization = (await getUserOrganizations()).find(
    (candidate) => candidate.id === organizationId,
  );
  if (!organization) return actionFailure("Estabelecimento não encontrado.");

  const accessibleModules = await getAccessibleModuleIds(organization);
  const canSee = (...moduleIds: AppModuleId[]) =>
    moduleIds.some((moduleId) => accessibleModules.includes(moduleId));

  const supabase = await createClient();
  const [dashboardResult, tasksResult, vacationsResult] = await Promise.all([
    supabase.rpc("get_today_dashboard", {
      p_organization_id: organizationId,
      p_include_sales: canSee("pos", "sales_report"),
      p_include_operations: canSee("pos", "order_tabs", "kitchen"),
      p_include_finance: canSee("finance"),
      p_include_stock: canSee("ingredients"),
      p_include_team: canSee("employees"),
    }),
    canSee("tasks") ? listTaskLists(organizationId) : Promise.resolve(null),
    canSee("payroll")
      ? getVacationsOverview(organizationId)
      : Promise.resolve(null),
  ]);

  const parsedDashboard = dashboardSchema.safeParse(dashboardResult.data);
  if (dashboardResult.error || !parsedDashboard.success) {
    return actionFailure("Não foi possível carregar o resumo do dia.");
  }

  const dashboard = parsedDashboard.data;
  const taskBoard = tasksResult?.status === "success" ? tasksResult.data : null;
  const pendingTasks = taskBoard
    ? taskBoard.taskLists.flatMap((taskList) =>
        taskList.tasks
          .filter((task) => task.completion === null)
          .map((task) => ({ title: task.title, listName: taskList.name })),
      )
    : null;
  const totalTasks = taskBoard
    ? taskBoard.taskLists.reduce(
        (total, taskList) => total + taskList.tasks.length,
        0,
      )
    : 0;

  return actionSuccess({
    today: dashboard.today,
    accessibleModules,
    sales: dashboard.sales ?? null,
    openOrders: dashboard.openOrders ?? null,
    kitchen: dashboard.kitchen ?? null,
    finance: dashboard.finance ?? null,
    stock: dashboard.stock ?? null,
    team: dashboard.team
      ? toTeamMembers(dashboard.team, dashboard.timeZone)
      : null,
    tasks: pendingTasks
      ? {
          pendingCount: pendingTasks.length,
          totalCount: totalTasks,
          pending: pendingTasks.slice(0, PENDING_TASKS_LIMIT),
        }
      : null,
    overdueVacationCount:
      vacationsResult?.status === "success"
        ? vacationsResult.data.employees.filter(
            (employee) =>
              employee.entitlement.status === "entitled" &&
              employee.entitlement.periods.some((period) => period.isOverdue),
          ).length
        : null,
  });
}
