"use server";

import { addDays, format, parseISO } from "date-fns";
import type { EmployeeId } from "@/features/employees/types";
import {
  hasModuleAccess,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import {
  getOrganizationClock,
  loadTimesheet,
  type TimesheetData,
} from "./load-timesheet";
import {
  type DayPunchesInput,
  dayPunchesSchema,
  registerPunchResultSchema,
  type TimeOffInput,
  timeOffSchema,
  type VoidPunchInput,
  voidPunchSchema,
} from "./schemas";
import { isMonthKey, zonedDateTimeToIso } from "./time-utils";
import type {
  RegisterPunchResult,
  TimeClockEmployee,
  TimeOffId,
  TimePunchId,
} from "./types";

const TIME_CLOCK_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  "22023": "Confira os dados. O horário não pode estar no futuro.",
  "42501": "Só o dono ou um gerente pode ajustar o ponto.",
  P0002: "Registro não encontrado. Atualize a tela.",
  TB010: "Esse PIN já foi criado. Digite o seu PIN.",
  TB008: "Marcações de ponto não podem ser alteradas nem apagadas.",
};

function getTimeClockErrorMessage(
  error: { code?: string },
  fallbackMessage: string,
) {
  return (
    (error.code && TIME_CLOCK_ERROR_MESSAGES[error.code]) ?? fallbackMessage
  );
}

const OVERLAPPING_TIME_OFF_CODE = "23P01";

export async function listTimeClockEmployees(
  organizationId: OrganizationId,
): Promise<ActionResult<TimeClockEmployee[]>> {
  if (!(await hasModuleAccess(organizationId, "time_clock"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_time_clock_employees", {
    p_organization_id: organizationId,
  });

  if (error) return actionFailure("Não foi possível carregar a equipe.");

  return actionSuccess(
    data.map((employee) => ({
      id: employee.id as EmployeeId,
      name: employee.name,
      jobTitle: employee.job_title,
      hasPin: employee.has_pin,
    })),
  );
}

export async function registerTimePunch(
  organizationId: OrganizationId,
  employeeId: EmployeeId,
  pin: string,
): Promise<ActionResult<RegisterPunchResult>> {
  if (!(await hasModuleAccess(organizationId, "time_clock"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_time_punch", {
    p_employee_id: employeeId,
    p_pin: pin,
  });

  if (error) return actionFailure("Não foi possível registrar o ponto.");

  const parsedResult = registerPunchResultSchema.safeParse(data);
  if (!parsedResult.success) {
    return actionFailure("Não foi possível registrar o ponto.");
  }

  const result = parsedResult.data;
  if (result.status !== "registered") return actionSuccess(result);

  const { status, ...receipt } = result;
  return actionSuccess({ status, receipt });
}

export async function getTimesheet(
  organizationId: OrganizationId,
  employeeId: EmployeeId,
  monthKey: string,
): Promise<ActionResult<TimesheetData>> {
  if (!(await hasModuleAccess(organizationId, "employees"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  if (!isMonthKey(monthKey)) return actionFailure("Mês inválido.");

  const timesheetData = await loadTimesheet(
    organizationId,
    employeeId,
    monthKey,
  );
  if (!timesheetData) {
    return actionFailure("Não foi possível carregar o espelho de ponto.");
  }
  return actionSuccess(timesheetData);
}

export async function addDayPunches(
  organizationId: OrganizationId,
  employeeId: EmployeeId,
  input: DayPunchesInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "employees"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const parsedInput = dayPunchesSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os horários e tente novamente.");
  }

  const clock = await getOrganizationClock(organizationId);
  if (!clock) return actionFailure("Não foi possível ajustar o ponto.");

  const { workDate, punches, reason } = parsedInput.data;
  const nextDate = format(addDays(parseISO(workDate), 1), "yyyy-MM-dd");
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_manual_time_punches", {
    p_employee_id: employeeId,
    p_work_date: workDate,
    p_punched_ats: punches.map((punch) =>
      zonedDateTimeToIso(
        punch.isNextDay ? nextDate : workDate,
        punch.time,
        clock.timeZone,
      ),
    ),
    p_reason: reason,
  });

  if (error) {
    return actionFailure(
      getTimeClockErrorMessage(error, "Não foi possível ajustar o ponto."),
    );
  }
  return actionSuccess();
}

export async function voidPunch(
  organizationId: OrganizationId,
  punchId: TimePunchId,
  input: VoidPunchInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "employees"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const parsedInput = voidPunchSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_time_punch", {
    p_punch_id: punchId,
    p_reason: parsedInput.data.reason,
  });

  if (error) {
    return actionFailure(
      getTimeClockErrorMessage(
        error,
        "Não foi possível desconsiderar a marcação.",
      ),
    );
  }
  return actionSuccess();
}

export async function saveTimeOff(
  organizationId: OrganizationId,
  employeeId: EmployeeId,
  input: TimeOffInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "employees"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const parsedInput = timeOffSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const { kind, startDate, endDate, notes } = parsedInput.data;
  const supabase = await createClient();
  const { error } = await supabase.from("employee_time_off").insert({
    organization_id: organizationId,
    employee_id: employeeId,
    kind,
    start_date: startDate,
    end_date: endDate,
    notes: notes || null,
  });

  if (error?.code === OVERLAPPING_TIME_OFF_CODE) {
    return actionFailure(
      "Já existe uma ausência lançada nesse período. Exclua a anterior para lançar outra.",
    );
  }
  if (error) return actionFailure("Não foi possível lançar a ausência.");
  return actionSuccess();
}

export async function deleteTimeOff(
  organizationId: OrganizationId,
  timeOffId: TimeOffId,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "employees"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employee_time_off")
    .delete()
    .eq("id", timeOffId)
    .eq("organization_id", organizationId);

  if (error) return actionFailure("Não foi possível excluir a ausência.");
  return actionSuccess();
}

export async function createPinAndRegisterPunch(
  organizationId: OrganizationId,
  employeeId: EmployeeId,
  pin: string,
): Promise<ActionResult<RegisterPunchResult>> {
  if (!(await hasModuleAccess(organizationId, "time_clock"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_employee_pin", {
    p_employee_id: employeeId,
    p_pin: pin,
  });

  if (error) {
    return actionFailure(
      getTimeClockErrorMessage(error, "Não foi possível criar o PIN."),
    );
  }

  return registerTimePunch(organizationId, employeeId, pin);
}
