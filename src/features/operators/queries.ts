import "server-only";

import { cache } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import { createClient } from "@/lib/supabase/server";
import { readOperatorSession } from "./session";
import type { Operator, OperatorAccess, OperatorId } from "./types";

export const OPERATOR_COLUMNS =
  "id, name, allowed_modules, can_access_settings";

type OperatorRow = {
  id: string;
  name: string;
  allowed_modules: Operator["allowedModules"];
  can_access_settings: boolean;
};

export function toOperator(row: OperatorRow): Operator {
  return {
    id: row.id as OperatorId,
    name: row.name,
    allowedModules: row.allowed_modules,
    canAccessSettings: row.can_access_settings,
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
          operators: operators.map(({ id, name }) => ({ id, name })),
        };
  },
);
