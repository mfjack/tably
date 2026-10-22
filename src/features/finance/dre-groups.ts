import type { SelectOption } from "@/components/form/select-field";
import type { DreGroup, FinancialEntryKind } from "./types";

export const DRE_GROUP_LABELS = {
  revenue: "Receita de vendas",
  other_income: "Outras receitas",
  sales_deductions: "Impostos e taxas sobre vendas",
  cost_of_goods: "CMV · insumos e mercadorias",
  packaging: "CMV · embalagens",
  personnel: "Pessoal (CMO)",
  occupancy: "Ocupação",
  marketing: "Marketing",
  administrative: "Administrativas e outras",
  financial: "Despesas financeiras",
  investment: "Investimentos (fora do resultado)",
} as const satisfies Record<DreGroup, string>;

const DRE_GROUPS_BY_KIND = {
  income: ["revenue", "other_income"],
  expense: [
    "cost_of_goods",
    "packaging",
    "sales_deductions",
    "personnel",
    "occupancy",
    "marketing",
    "administrative",
    "financial",
    "investment",
  ],
} as const satisfies Record<FinancialEntryKind, readonly DreGroup[]>;

export const DEFAULT_DRE_GROUP_BY_KIND = {
  income: "other_income",
  expense: "administrative",
} as const satisfies Record<FinancialEntryKind, DreGroup>;

export function getDreGroupOptions(
  kind: FinancialEntryKind,
): readonly SelectOption[] {
  return DRE_GROUPS_BY_KIND[kind].map((group) => ({
    value: group,
    label: DRE_GROUP_LABELS[group],
  }));
}

export function isDreGroupOfKind(
  group: DreGroup,
  kind: FinancialEntryKind,
): boolean {
  return (DRE_GROUPS_BY_KIND[kind] as readonly DreGroup[]).includes(group);
}
