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
} from "@/lib/action-result";
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from "@/lib/database-errors";
import { fromSelectFieldValue } from "@/lib/optional-select-value";
import { createClient } from "@/lib/supabase/server";
import {
  EMPLOYEE_COLUMNS,
  toEmployee,
  toWorkSchedule,
  WORK_SCHEDULE_COLUMNS,
} from "./mappers";

const ACCESS_DENIED = actionFailure(MODULE_ACCESS_DENIED_MESSAGE);

const EMPLOYEE_ACCESS_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  "23505":
    "Já existe um operador com o nome desse funcionário. Renomeie um dos dois.",
  "22023": "Escolha pelo menos uma página para o acesso ao sistema.",
  TB004: "Pelo menos um operador precisa ter acesso a Configurações.",
};

async function canUseEmployees(organizationId: OrganizationId) {
  return hasModuleAccess(organizationId, "employees");
}

import { getNationalHolidays } from "./national-holidays";
import {
  DEFAULT_DAILY_TOLERANCE_MINUTES,
  DEFAULT_MARK_TOLERANCE_MINUTES,
  type EmployeeInput,
  employeeSchema,
  type HolidayInput,
  holidaySchema,
  type WorkScheduleInput,
  workScheduleSchema,
} from "./schemas";
import type {
  EmployeeId,
  EmployeeWithAccess,
  Holiday,
  HolidayId,
  WorkSchedule,
  WorkScheduleId,
} from "./types";

export async function listEmployees(
  organizationId: OrganizationId,
): Promise<ActionResult<EmployeeWithAccess[]>> {
  if (!(await canUseEmployees(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select(
      `${EMPLOYEE_COLUMNS}, operators(id, allowed_modules, can_access_settings)`,
    )
    .eq("organization_id", organizationId)
    .order("name");

  if (error) return actionFailure("Não foi possível carregar os funcionários.");

  return actionSuccess(
    data.map((row) => {
      const operator = row.operators[0];
      return {
        ...toEmployee(row),
        systemAccess: operator
          ? {
              operatorId: operator.id as OperatorId,
              allowedModules: operator.allowed_modules,
              canAccessSettings: operator.can_access_settings,
            }
          : null,
      };
    }),
  );
}

export async function saveEmployee(
  organizationId: OrganizationId,
  employeeId: EmployeeId | null,
  input: EmployeeInput,
): Promise<ActionResult> {
  if (!(await canUseEmployees(organizationId))) return ACCESS_DENIED;

  const parsedInput = employeeSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const employee = parsedInput.data;
  const values = {
    name: employee.name,
    cpf: employee.cpf,
    pis: employee.pis || null,
    birth_date: employee.birthDate || null,
    phone: employee.phone || null,
    job_title: employee.jobTitle,
    cbo: employee.cbo || null,
    employment_type: employee.employmentType,
    admission_date: employee.admissionDate,
    effective_date: employee.effectiveDate || null,
    termination_date: employee.terminationDate || null,
    salary: employee.salary,
    work_schedule_id:
      fromSelectFieldValue<WorkScheduleId>(employee.workScheduleId) ?? null,
    overtime_policy: employee.overtimePolicy,
    dependents: employee.dependents ?? 0,
    has_transport_voucher: employee.hasTransportVoucher,
    notes: employee.notes || null,
  };
  const supabase = await createClient();
  const { data, error } = employeeId
    ? await supabase
        .from("employees")
        .update(values)
        .eq("id", employeeId)
        .eq("organization_id", organizationId)
        .select("id")
        .single()
    : await supabase
        .from("employees")
        .insert({ ...values, organization_id: organizationId })
        .select("id")
        .single();

  if (error) {
    return actionFailure(
      isUniqueViolation(error)
        ? "Já existe um funcionário com esse CPF."
        : "Não foi possível salvar o funcionário.",
    );
  }

  const { error: accessError } = await supabase.rpc("save_employee_access", {
    p_employee_id: data.id,
    p_is_enabled: employee.hasSystemAccess,
    p_allowed_modules: employee.allowedModules,
    p_can_access_settings: employee.canAccessSettings,
  });

  if (accessError) {
    return actionFailure(
      `Funcionário salvo, mas o acesso ao sistema não. ${
        (accessError.code &&
          EMPLOYEE_ACCESS_ERROR_MESSAGES[accessError.code]) ??
        "Tente de novo."
      }`,
    );
  }

  return actionSuccess();
}

export async function resetEmployeePin(
  organizationId: OrganizationId,
  employeeId: EmployeeId,
): Promise<ActionResult> {
  if (!(await canUseEmployees(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { error } = await supabase.rpc("reset_person_pin", {
    p_employee_id: employeeId,
  });

  if (error) return actionFailure("Não foi possível redefinir o PIN.");
  return actionSuccess();
}

export async function deleteEmployee(
  organizationId: OrganizationId,
  employeeId: EmployeeId,
): Promise<ActionResult> {
  if (!(await canUseEmployees(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .delete()
    .eq("id", employeeId)
    .eq("organization_id", organizationId);

  if (error) {
    return actionFailure(
      isForeignKeyViolation(error)
        ? "Esse funcionário já tem marcações de ponto ou holerites, que precisam ser guardados. Informe a data de desligamento em vez de excluir."
        : "Não foi possível excluir o funcionário.",
    );
  }
  return actionSuccess();
}

export async function listWorkSchedules(
  organizationId: OrganizationId,
): Promise<ActionResult<WorkSchedule[]>> {
  if (!(await canUseEmployees(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_schedules")
    .select(WORK_SCHEDULE_COLUMNS)
    .eq("organization_id", organizationId)
    .order("name");

  if (error) return actionFailure("Não foi possível carregar as jornadas.");

  return actionSuccess(data.map(toWorkSchedule));
}

export async function saveWorkSchedule(
  organizationId: OrganizationId,
  workScheduleId: WorkScheduleId | null,
  input: WorkScheduleInput,
): Promise<ActionResult> {
  if (!(await canUseEmployees(organizationId))) return ACCESS_DENIED;

  const parsedInput = workScheduleSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const { name, markToleranceMinutes, dailyToleranceMinutes, days } =
    parsedInput.data;
  const values = {
    name,
    mark_tolerance_minutes:
      markToleranceMinutes ?? DEFAULT_MARK_TOLERANCE_MINUTES,
    daily_tolerance_minutes:
      dailyToleranceMinutes ?? DEFAULT_DAILY_TOLERANCE_MINUTES,
  };
  const supabase = await createClient();
  const { data, error } = workScheduleId
    ? await supabase
        .from("work_schedules")
        .update(values)
        .eq("id", workScheduleId)
        .eq("organization_id", organizationId)
        .select("id")
        .single()
    : await supabase
        .from("work_schedules")
        .insert({ ...values, organization_id: organizationId })
        .select("id")
        .single();

  if (error) {
    return actionFailure(
      isUniqueViolation(error)
        ? "Já existe uma jornada com esse nome."
        : "Não foi possível salvar a jornada.",
    );
  }

  const { error: deleteError } = await supabase
    .from("work_schedule_days")
    .delete()
    .eq("schedule_id", data.id);

  if (deleteError) return actionFailure("Não foi possível salvar os horários.");

  const { error: insertError } = await supabase
    .from("work_schedule_days")
    .insert(
      days
        .filter((day) => day.isWorkday)
        .map((day) => ({
          organization_id: organizationId,
          schedule_id: data.id,
          weekday: day.weekday,
          start_time: day.startTime,
          break_start: day.breakStartTime || null,
          break_end: day.breakEndTime || null,
          end_time: day.endTime,
        })),
    );

  if (insertError) return actionFailure("Não foi possível salvar os horários.");
  return actionSuccess();
}

export async function deleteWorkSchedule(
  organizationId: OrganizationId,
  workScheduleId: WorkScheduleId,
): Promise<ActionResult> {
  if (!(await canUseEmployees(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { error } = await supabase
    .from("work_schedules")
    .delete()
    .eq("id", workScheduleId)
    .eq("organization_id", organizationId);

  if (error) return actionFailure("Não foi possível excluir a jornada.");
  return actionSuccess();
}

export async function listHolidays(
  organizationId: OrganizationId,
  year: number,
): Promise<ActionResult<Holiday[]>> {
  if (!(await canUseEmployees(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("holidays")
    .select("id, holiday_date, name")
    .eq("organization_id", organizationId)
    .gte("holiday_date", `${year}-01-01`)
    .lte("holiday_date", `${year}-12-31`)
    .order("holiday_date");

  if (error) return actionFailure("Não foi possível carregar os feriados.");

  return actionSuccess(
    data.map((holiday) => ({
      id: holiday.id as HolidayId,
      date: holiday.holiday_date,
      name: holiday.name,
    })),
  );
}

export async function saveHoliday(
  organizationId: OrganizationId,
  input: HolidayInput,
): Promise<ActionResult> {
  if (!(await canUseEmployees(organizationId))) return ACCESS_DENIED;

  const parsedInput = holidaySchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("holidays").insert({
    organization_id: organizationId,
    holiday_date: parsedInput.data.date,
    name: parsedInput.data.name,
  });

  if (error) {
    return actionFailure(
      isUniqueViolation(error)
        ? "Já existe um feriado nessa data."
        : "Não foi possível salvar o feriado.",
    );
  }
  return actionSuccess();
}

export async function addNationalHolidays(
  organizationId: OrganizationId,
  year: number,
): Promise<ActionResult> {
  if (!(await canUseEmployees(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { error } = await supabase.from("holidays").upsert(
    getNationalHolidays(year).map((holiday) => ({
      organization_id: organizationId,
      holiday_date: holiday.date,
      name: holiday.name,
    })),
    { onConflict: "organization_id,holiday_date", ignoreDuplicates: true },
  );

  if (error) return actionFailure("Não foi possível adicionar os feriados.");
  return actionSuccess();
}

export async function deleteHoliday(
  organizationId: OrganizationId,
  holidayId: HolidayId,
): Promise<ActionResult> {
  if (!(await canUseEmployees(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { error } = await supabase
    .from("holidays")
    .delete()
    .eq("id", holidayId)
    .eq("organization_id", organizationId);

  if (error) return actionFailure("Não foi possível excluir o feriado.");
  return actionSuccess();
}
