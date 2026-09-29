import type { AppModuleId } from "@/features/organizations/types";
import type { Brand } from "@/lib/brand";

export type OperatorId = Brand<string, "OperatorId">;

export type Operator = {
  id: OperatorId;
  name: string;
  allowedModules: AppModuleId[];
  canAccessSettings: boolean;
};

export type OperatorSummary = Pick<Operator, "id" | "name">;

export type OperatorAccess =
  | { mode: "disabled" }
  | { mode: "locked"; operators: OperatorSummary[] }
  | { mode: "unlocked"; operator: Operator };
