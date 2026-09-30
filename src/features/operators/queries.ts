import "server-only";

import { cache } from "react";
import type { EmployeeId } from "@/features/employees/types";
import type { OrganizationId } from "@/features/organizations/types";
import { createClient } from "@/lib/supabase/server";
import { readOperatorSession } from "./session";
import type {
  Operator,
  OperatorAccess,
  OperatorId,
  OperatorSummary,
} from "./types";

export const OPERATOR_COLUMNS =
  "id, name, allowed_modules, can_access_settings, employee_id, has_pin";

type OperatorRow = {
  id: string;
  name: string;
  allowed_modules: Operator["allowedModules"];
  can_access_settings: boolean;
  employee_id: string | null;
  has_pin: boolean | null;
};

export function toOperator(row: OperatorRow): Operator {
  return {
    id: row.id as OperatorId,
    name: row.name,
    allowedModules: row.allowed_modules,
    canAccessSettings: row.can_access_settings,
    employeeId: row.employee_id as EmployeeId | null,
    hasPin: row.has_pin ?? false,
  };
}

export const getOperatorAccess = cache(
  async (organizationId: OrganizationId): Promise<OperatorAccess> => {
    const supabase = await createClient();
    const [{ data, error }, sessionOperatorId] = await Promise.all([
      supabase
        .from("operators")
        .select(OPERATOR_COLUMNS)
        .eq("organization_id", organizationId)
        .order("name"),
      readOperatorSession(organizationId),
    ]);

    if (error) throw error;
    if (data.length === 0) return { mode: "disabled" };

    const operators = data.map(toOperator);
    const activeOperator = operators.find(
      (operator) => operator.id === sessionOperatorId,
    );

    return activeOperator
      ? { mode: "unlocked", operator: activeOperator }
      : {
          mode: "locked",
          operators: operators.map(({ id, name, hasPin }) => ({
            id,
            name,
            hasPin,
          })),
        };
  },
);

export const listOperatorSummaries = cache(
  async (organizationId: OrganizationId): Promise<OperatorSummary[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("operators")
      .select("id, name")
      .eq("organization_id", organizationId)
      .order("name");

    if (error) throw error;

    return data.map((operator) => ({
      id: operator.id as OperatorId,
      name: operator.name,
    }));
  },
);
