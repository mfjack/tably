import type { OperatorId } from "@/features/operators/types";
import type { AppModuleId } from "@/features/organizations/types";
import type { Brand } from "@/lib/brand";
import type { Database } from "@/lib/supabase/database.types";

export type EmployeeId = Brand<string, "EmployeeId">;
export type WorkScheduleId = Brand<string, "WorkScheduleId">;
export type HolidayId = Brand<string, "HolidayId">;

export type EmploymentType = Database["public"]["Enums"]["employment_type"];
export type OvertimePolicy = Database["public"]["Enums"]["overtime_policy"];

export type WorkScheduleDay = {
  weekday: number;
  startTime: string;
  breakStartTime: string | null;
  breakEndTime: string | null;
  endTime: string;
};

export type WorkSchedule = {
  id: WorkScheduleId;
  name: string;
  markToleranceMinutes: number;
  dailyToleranceMinutes: number;
  days: WorkScheduleDay[];
};

export type EmployeeStatus = "active" | "trial" | "terminated" | "upcoming";

export type Employee = {
  id: EmployeeId;
  name: string;
  cpf: string;
  pis: string | null;
  birthDate: string | null;
  phone: string | null;
  jobTitle: string;
  cbo: string | null;
  employmentType: EmploymentType;
  admissionDate: string;
  effectiveDate: string | null;
  terminationDate: string | null;
  salary: number;
  workScheduleId: WorkScheduleId | null;
  overtimePolicy: OvertimePolicy;
  dependents: number;
  hasTransportVoucher: boolean;
  notes: string | null;
  hasPin: boolean;
};

export type EmployeeSystemAccess = {
  operatorId: OperatorId;
  allowedModules: AppModuleId[];
  canAccessSettings: boolean;
};

export type EmployeeWithAccess = Employee & {
  systemAccess: EmployeeSystemAccess | null;
  canDelete: boolean;
};

export type EmployeeSummary = Pick<Employee, "id" | "name" | "jobTitle">;

export type Holiday = {
  id: HolidayId;
  date: string;
  name: string;
};
