import type { EmployeeId } from "@/features/employees/types";
import type { Brand } from "@/lib/brand";
import type { Database } from "@/lib/supabase/database.types";

export type TimePunchId = Brand<string, "TimePunchId">;
export type TimeOffId = Brand<string, "TimeOffId">;

export type TimePunchSource = Database["public"]["Enums"]["time_punch_source"];
export type TimeOffKind = Database["public"]["Enums"]["time_off_kind"];

export type TimePunchVoiding = {
  reason: string;
  voidedByName: string | null;
  voidedAt: string;
};

export type TimePunch = {
  id: TimePunchId;
  nsr: number;
  punchedAt: string;
  workDate: string;
  source: TimePunchSource;
  reason: string | null;
  recordedByName: string | null;
  createdAt: string;
  hash: string;
  voiding: TimePunchVoiding | null;
};

export type TimeOff = {
  id: TimeOffId;
  employeeId: EmployeeId;
  kind: TimeOffKind;
  startDate: string;
  endDate: string;
  notes: string | null;
  createdByName: string | null;
};

export type TimeClockEmployee = {
  id: EmployeeId;
  name: string;
  jobTitle: string;
  hasPin: boolean;
};

export type PunchReceipt = {
  nsr: number;
  punchedAt: string;
  workDate: string;
  hash: string;
  employeeName: string;
  employeeCpf: string;
  employeePis: string | null;
  dayPunches: string[];
};

export type RegisterPunchResult =
  | { status: "registered"; receipt: PunchReceipt }
  | { status: "invalid_pin" }
  | { status: "locked"; lockedUntil: string }
  | { status: "duplicate"; punchedAt: string }
  | { status: "inactive" }
  | { status: "not_found" };
