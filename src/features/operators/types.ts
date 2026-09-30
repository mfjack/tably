import type { EmployeeId } from "@/features/employees/types";
import type { AppModuleId } from "@/features/organizations/types";
import type { Brand } from "@/lib/brand";

export type OperatorId = Brand<string, "OperatorId">;

export type Operator = {
  id: OperatorId;
  name: string;
  allowedModules: AppModuleId[];
  canAccessSettings: boolean;
  employeeId: EmployeeId | null;
  hasPin: boolean;
};

export type OperatorSummary = Pick<Operator, "id" | "name">;

export type LockScreenOperator = Pick<Operator, "id" | "name" | "hasPin">;

export type OperatorAccess =
  | { mode: "disabled" }
  | { mode: "locked"; operators: LockScreenOperator[] }
  | { mode: "unlocked"; operator: Operator };
