import type {
  Employee,
  EmployeeStatus,
  EmploymentType,
  OvertimePolicy,
} from "./types";

export const EMPLOYMENT_TYPE_LABELS = {
  clt: "CLT",
  apprentice: "Jovem aprendiz",
  intern: "Estagiário",
} as const satisfies Record<EmploymentType, string>;

export const OVERTIME_POLICY_LABELS = {
  paid: "Pagar horas extras",
  hour_bank: "Banco de horas",
} as const satisfies Record<OvertimePolicy, string>;

export const EMPLOYEE_STATUS_LABELS = {
  active: "Ativo",
  trial: "Em experiência",
  terminated: "Desligado",
  upcoming: "Início futuro",
} as const satisfies Record<EmployeeStatus, string>;

export function getEmployeeStatus(
  employee: Pick<
    Employee,
    "admissionDate" | "effectiveDate" | "terminationDate"
  >,
  today: string,
): EmployeeStatus {
  if (employee.terminationDate && employee.terminationDate < today) {
    return "terminated";
  }
  if (employee.admissionDate > today) return "upcoming";
  if (employee.effectiveDate && employee.effectiveDate > today) return "trial";
  return "active";
}
