import type { MemberRole } from "./types";

export const MEMBER_ROLE_LABELS = {
  owner: "Dono",
  manager: "Gerente",
  cashier: "Caixa",
  kitchen: "Cozinha",
  waiter: "Garçom",
} as const satisfies Record<MemberRole, string>;
