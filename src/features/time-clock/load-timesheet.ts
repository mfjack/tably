import "server-only";

import {
  EMPLOYEE_COLUMNS,
  toEmployee,
  toWorkSchedule,
  WORK_SCHEDULE_COLUMNS,
} from "@/features/employees/mappers";
import type {
  Employee,
  EmployeeId,
  Holiday,
  HolidayId,
  WorkSchedule,
} from "@/features/employees/types";
import type { OrganizationId } from "@/features/organizations/types";
import { createClient } from "@/lib/supabase/server";
import { getMonthEnd, getMonthStart } from "./time-utils";
import { buildTimesheet, type Timesheet } from "./timesheet";
import type { TimeOff, TimeOffId, TimePunch, TimePunchId } from "./types";

const PUNCH_COLUMNS =
  "id, nsr, punched_at, work_date, source, reason, recorded_by_name, created_at, hash, voiding:time_punch_voids(reason, voided_by_name, created_at)";

type VoidingRow = {
  reason: string;
  voided_by_name: string | null;
  created_at: string;
};

function pickVoiding(voiding: VoidingRow | VoidingRow[] | null) {
  const row = Array.isArray(voiding) ? (voiding[0] ?? null) : voiding;
  return row
    ? {
        reason: row.reason,
        voidedByName: row.voided_by_name,
        voidedAt: row.created_at,
      }
    : null;
}

export type OrganizationClock = {
  today: string;
  timeZone: string;
};

export async function getOrganizationClock(
  organizationId: OrganizationId,
): Promise<OrganizationClock | null> {
  const supabase = await createClient();
  const [{ data: today, error: todayError }, { data, error }] =
    await Promise.all([
      supabase.rpc("organization_today", { p_organization_id: organizationId }),
      supabase
        .from("organizations")
        .select("timezone")
        .eq("id", organizationId)
        .single(),
    ]);

  if (todayError || error || !today) return null;
  return { today, timeZone: data.timezone };
}

export type TimesheetData = OrganizationClock & {
  employee: Employee;
  schedule: WorkSchedule | null;
  timesheet: Timesheet;
  timeOff: TimeOff[];
  previousHourBankMinutes: number;
};

export async function loadTimesheet(
  organizationId: OrganizationId,
  employeeId: EmployeeId,
  monthKey: string,
): Promise<TimesheetData | null> {
  const clock = await getOrganizationClock(organizationId);
  if (!clock) return null;

  const monthStart = getMonthStart(monthKey);
  const monthEnd = getMonthEnd(monthKey);
  const supabase = await createClient();

  const { data: employeeRow, error: employeeError } = await supabase
    .from("employees")
    .select(EMPLOYEE_COLUMNS)
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (employeeError || !employeeRow) return null;
  const employee = toEmployee(employeeRow);

  const [
    scheduleResult,
    punchesResult,
    previousPunchResult,
    timeOffResult,
    holidaysResult,
    previousPayslipResult,
  ] = await Promise.all([
    employee.workScheduleId
      ? supabase
          .from("work_schedules")
          .select(WORK_SCHEDULE_COLUMNS)
          .eq("id", employee.workScheduleId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("time_punches")
      .select(PUNCH_COLUMNS)
      .eq("employee_id", employeeId)
      .gte("work_date", monthStart)
      .lte("work_date", monthEnd)
      .order("punched_at"),
    supabase
      .from("time_punches")
      .select("punched_at, time_punch_voids(id)")
      .eq("employee_id", employeeId)
      .lt("work_date", monthStart)
      .order("punched_at", { ascending: false })
      .limit(5),
    supabase
      .from("employee_time_off")
      .select(
        "id, employee_id, kind, start_date, end_date, notes, created_by_name",
      )
      .eq("employee_id", employeeId)
      .lte("start_date", monthEnd)
      .gte("end_date", monthStart)
      .order("start_date"),
    supabase
      .from("holidays")
      .select("id, holiday_date, name")
      .eq("organization_id", organizationId)
      .gte("holiday_date", monthStart)
      .lte("holiday_date", monthEnd),
    supabase
      .from("payslips")
      .select("hour_bank_balance_minutes")
      .eq("employee_id", employeeId)
      .lt("reference_month", monthStart)
      .order("reference_month", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (
    scheduleResult.error ||
    punchesResult.error ||
    previousPunchResult.error ||
    timeOffResult.error ||
    holidaysResult.error ||
    previousPayslipResult.error
  ) {
    return null;
  }

  const schedule = scheduleResult.data
    ? toWorkSchedule(scheduleResult.data)
    : null;
  const punches: TimePunch[] = punchesResult.data.map((punch) => ({
    id: punch.id as TimePunchId,
    nsr: punch.nsr,
    punchedAt: punch.punched_at,
    workDate: punch.work_date,
    source: punch.source,
    reason: punch.reason,
    recordedByName: punch.recorded_by_name,
    createdAt: punch.created_at,
    hash: punch.hash,
    voiding: pickVoiding(punch.voiding),
  }));
  const timeOff: TimeOff[] = timeOffResult.data.map((entry) => ({
    id: entry.id as TimeOffId,
    employeeId: entry.employee_id as EmployeeId,
    kind: entry.kind,
    startDate: entry.start_date,
    endDate: entry.end_date,
    notes: entry.notes,
    createdByName: entry.created_by_name,
  }));
  const holidays: Holiday[] = holidaysResult.data.map((holiday) => ({
    id: holiday.id as HolidayId,
    date: holiday.holiday_date,
    name: holiday.name,
  }));
  const previousDayLastPunchAt =
    previousPunchResult.data.find(
      (punch) => punch.time_punch_voids.length === 0,
    )?.punched_at ?? null;

  return {
    ...clock,
    employee,
    schedule,
    timeOff,
    previousHourBankMinutes:
      previousPayslipResult.data?.hour_bank_balance_minutes ?? 0,
    timesheet: buildTimesheet({
      monthKey,
      today: clock.today,
      timeZone: clock.timeZone,
      employee,
      schedule,
      punches,
      timeOff,
      holidays,
      previousDayLastPunchAt,
    }),
  };
}
