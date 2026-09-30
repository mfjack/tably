import type { Tables } from "@/lib/supabase/database.types";
import type {
  Employee,
  EmployeeId,
  WorkSchedule,
  WorkScheduleId,
} from "./types";

export const EMPLOYEE_COLUMNS =
  "id, name, cpf, pis, birth_date, phone, job_title, cbo, employment_type, admission_date, effective_date, termination_date, salary, work_schedule_id, overtime_policy, dependents, has_transport_voucher, notes, has_pin";

export const WORK_SCHEDULE_COLUMNS =
  "id, name, mark_tolerance_minutes, daily_tolerance_minutes, days:work_schedule_days(weekday, start_time, break_start, break_end, end_time)";

const TIME_LENGTH = 5;

type EmployeeRow = Pick<
  Tables<"employees">,
  | "id"
  | "name"
  | "cpf"
  | "pis"
  | "birth_date"
  | "phone"
  | "job_title"
  | "cbo"
  | "employment_type"
  | "admission_date"
  | "effective_date"
  | "termination_date"
  | "salary"
  | "work_schedule_id"
  | "overtime_policy"
  | "dependents"
  | "has_transport_voucher"
  | "notes"
  | "has_pin"
>;

type WorkScheduleRow = Pick<
  Tables<"work_schedules">,
  "id" | "name" | "mark_tolerance_minutes" | "daily_tolerance_minutes"
> & {
  days: Pick<
    Tables<"work_schedule_days">,
    "weekday" | "start_time" | "break_start" | "break_end" | "end_time"
  >[];
};

function toTime(value: string): string {
  return value.slice(0, TIME_LENGTH);
}

function toOptionalTime(value: string | null): string | null {
  return value ? toTime(value) : null;
}

export function toEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id as EmployeeId,
    name: row.name,
    cpf: row.cpf,
    pis: row.pis,
    birthDate: row.birth_date,
    phone: row.phone,
    jobTitle: row.job_title,
    cbo: row.cbo,
    employmentType: row.employment_type,
    admissionDate: row.admission_date,
    effectiveDate: row.effective_date,
    terminationDate: row.termination_date,
    salary: row.salary,
    workScheduleId: row.work_schedule_id as WorkScheduleId | null,
    overtimePolicy: row.overtime_policy,
    dependents: row.dependents,
    hasTransportVoucher: row.has_transport_voucher,
    notes: row.notes,
    hasPin: row.has_pin ?? false,
  };
}

export function toWorkSchedule(row: WorkScheduleRow): WorkSchedule {
  return {
    id: row.id as WorkScheduleId,
    name: row.name,
    markToleranceMinutes: row.mark_tolerance_minutes,
    dailyToleranceMinutes: row.daily_tolerance_minutes,
    days: row.days
      .map((day) => ({
        weekday: day.weekday,
        startTime: toTime(day.start_time),
        breakStartTime: toOptionalTime(day.break_start),
        breakEndTime: toOptionalTime(day.break_end),
        endTime: toTime(day.end_time),
      }))
      .sort((first, second) => first.weekday - second.weekday),
  };
}
