import { getDaysInMonth, parseISO } from "date-fns";
import type { DreGroup } from "../types";
import type {
  BenchmarkStatus,
  BreakEvenAnalysis,
  IncomeStatement,
  IncomeStatementData,
  StatementIndicator,
  StatementLineDetail,
  StatementLineKind,
} from "./types";

const CARD_FEES_LABEL = "Taxas de cartão e Pix (calculadas das vendas)";
const PDV_SALES_LABEL = "Vendas do PDV e comandas";
const STOCK_LOSSES_LABEL = "Perdas de estoque";

const FIXED_COST_GROUPS = [
  "personnel",
  "occupancy",
  "marketing",
  "administrative",
  "financial",
] as const satisfies readonly DreGroup[];

type Benchmark = {
  target: string;
  goodMax: number;
  attentionMax: number;
};

const CMV_BENCHMARK: Benchmark = {
  target: "Saudável: até 35%",
  goodMax: 0.35,
  attentionMax: 0.4,
};

const CMO_BENCHMARK: Benchmark = {
  target: "Saudável: até 30%",
  goodMax: 0.3,
  attentionMax: 0.35,
};

const PRIME_COST_BENCHMARK: Benchmark = {
  target: "Saudável: até 60%",
  goodMax: 0.6,
  attentionMax: 0.65,
};

const OCCUPANCY_BENCHMARK: Benchmark = {
  target: "Saudável: até 10%",
  goodMax: 0.1,
  attentionMax: 0.15,
};

type GroupTotals = {
  amount: number;
  details: StatementLineDetail[];
};

type PeriodFigures = {
  grossRevenue: number;
  pdvSales: number;
  otherSales: GroupTotals;
  cardFees: number;
  salesTaxes: GroupTotals;
  goodsCost: GroupTotals;
  packaging: GroupTotals;
  groups: Record<DreGroup, GroupTotals>;
  usesRecipeCost: boolean;
};

function sumGroup(data: IncomeStatementData, group: DreGroup): GroupTotals {
  const categories = data.categories.filter(
    (category) => category.group === group,
  );
  return {
    amount: categories.reduce((total, category) => total + category.amount, 0),
    details: categories.map((category) => ({
      label: category.name,
      amount: category.amount,
    })),
  };
}

function toFigures(data: IncomeStatementData): PeriodFigures {
  const groups = {
    revenue: sumGroup(data, "revenue"),
    other_income: sumGroup(data, "other_income"),
    sales_deductions: sumGroup(data, "sales_deductions"),
    cost_of_goods: sumGroup(data, "cost_of_goods"),
    packaging: sumGroup(data, "packaging"),
    personnel: sumGroup(data, "personnel"),
    occupancy: sumGroup(data, "occupancy"),
    marketing: sumGroup(data, "marketing"),
    administrative: sumGroup(data, "administrative"),
    financial: sumGroup(data, "financial"),
    investment: sumGroup(data, "investment"),
  } satisfies Record<DreGroup, GroupTotals>;
  const usesRecipeCost = data.recipeCost > 0;
  const stockLosses = usesRecipeCost ? data.stockLosses : 0;

  return {
    grossRevenue: data.grossSales + groups.revenue.amount,
    pdvSales: data.grossSales,
    otherSales: groups.revenue,
    cardFees: data.cardFees,
    salesTaxes: groups.sales_deductions,
    goodsCost: usesRecipeCost
      ? {
          amount: data.recipeCost + stockLosses,
          details: [
            {
              label: "Custo dos produtos vendidos (fichas técnicas)",
              amount: data.recipeCost,
            },
            ...(stockLosses > 0
              ? [{ label: STOCK_LOSSES_LABEL, amount: stockLosses }]
              : []),
          ],
        }
      : groups.cost_of_goods,
    packaging: groups.packaging,
    groups,
    usesRecipeCost,
  };
}

type LineValues = {
  amount: number;
  details: StatementLineDetail[];
};

type LineDefinition = {
  id: string;
  label: string;
  kind: StatementLineKind;
  getValues: (figures: PeriodFigures) => LineValues;
};

function deductions(figures: PeriodFigures): LineValues {
  return {
    amount: figures.cardFees + figures.salesTaxes.amount,
    details: [
      ...(figures.cardFees > 0
        ? [{ label: CARD_FEES_LABEL, amount: figures.cardFees }]
        : []),
      ...figures.salesTaxes.details,
    ],
  };
}

function netRevenue(figures: PeriodFigures): number {
  return figures.grossRevenue - deductions(figures).amount;
}

function goodsCost(figures: PeriodFigures): LineValues {
  return {
    amount: figures.goodsCost.amount + figures.packaging.amount,
    details: [...figures.goodsCost.details, ...figures.packaging.details],
  };
}

function grossProfit(figures: PeriodFigures): number {
  return netRevenue(figures) - goodsCost(figures).amount;
}

function operatingExpenses(figures: PeriodFigures): number {
  return (["personnel", "occupancy", "marketing", "administrative"] as const)
    .map((group) => figures.groups[group].amount)
    .reduce((total, amount) => total + amount, 0);
}

function operatingResult(figures: PeriodFigures): number {
  return grossProfit(figures) - operatingExpenses(figures);
}

function netIncome(figures: PeriodFigures): number {
  return (
    operatingResult(figures) +
    figures.groups.other_income.amount -
    figures.groups.financial.amount
  );
}

function groupLine(id: string, label: string, group: DreGroup): LineDefinition {
  return {
    id,
    label,
    kind: "deduction",
    getValues: (figures) => figures.groups[group],
  };
}

function totalLine(
  id: string,
  label: string,
  kind: StatementLineKind,
  getAmount: (figures: PeriodFigures) => number,
): LineDefinition {
  return {
    id,
    label,
    kind,
    getValues: (figures) => ({ amount: getAmount(figures), details: [] }),
  };
}

const LINE_DEFINITIONS: readonly LineDefinition[] = [
  {
    id: "gross-revenue",
    label: "Receita bruta",
    kind: "revenue",
    getValues: (figures) => ({
      amount: figures.grossRevenue,
      details: [
        { label: PDV_SALES_LABEL, amount: figures.pdvSales },
        ...figures.otherSales.details,
      ],
    }),
  },
  {
    id: "deductions",
    label: "Deduções",
    kind: "deduction",
    getValues: deductions,
  },
  totalLine("net-revenue", "Receita líquida", "subtotal", netRevenue),
  {
    id: "goods-cost",
    label: "CMV · custo da mercadoria vendida",
    kind: "deduction",
    getValues: goodsCost,
  },
  totalLine("gross-profit", "Lucro bruto", "subtotal", grossProfit),
  groupLine("personnel", "Pessoal (CMO)", "personnel"),
  groupLine("occupancy", "Ocupação", "occupancy"),
  groupLine("marketing", "Marketing", "marketing"),
  groupLine("administrative", "Administrativas e outras", "administrative"),
  totalLine(
    "operating-result",
    "Resultado operacional",
    "subtotal",
    operatingResult,
  ),
  {
    id: "other-income",
    label: "Outras receitas",
    kind: "revenue",
    getValues: (figures) => figures.groups.other_income,
  },
  groupLine("financial", "Despesas financeiras", "financial"),
  totalLine("net-income", "Lucro líquido", "result", netIncome),
];

function getRatio(amount: number, revenue: number): number | null {
  return revenue > 0 ? amount / revenue : null;
}

function getBenchmarkStatus(
  ratio: number | null,
  benchmark: Benchmark,
): BenchmarkStatus {
  if (ratio === null) return "none";
  if (ratio <= benchmark.goodMax) return "good";
  if (ratio <= benchmark.attentionMax) return "attention";
  return "bad";
}

function buildIndicator(
  id: string,
  label: string,
  amount: number,
  revenue: number,
  benchmark: Benchmark,
): StatementIndicator {
  const ratio = getRatio(amount, revenue);
  return {
    id,
    label,
    amount,
    percent: ratio,
    target: benchmark.target,
    status: getBenchmarkStatus(ratio, benchmark),
  };
}

function buildBreakEven(
  figures: PeriodFigures,
  monthKey: string,
): BreakEvenAnalysis {
  const variableCosts = deductions(figures).amount + goodsCost(figures).amount;
  const fixedCosts = FIXED_COST_GROUPS.map(
    (group) => figures.groups[group].amount,
  ).reduce((total, amount) => total + amount, 0);
  const contributionMargin =
    figures.grossRevenue > 0
      ? (figures.grossRevenue - variableCosts) / figures.grossRevenue
      : null;
  const breakEvenRevenue =
    contributionMargin && contributionMargin > 0
      ? fixedCosts / contributionMargin
      : null;
  const daysInMonth = getDaysInMonth(parseISO(`${monthKey}-01`));

  return {
    fixedCosts,
    contributionMargin,
    breakEvenRevenue,
    dailyTarget:
      breakEvenRevenue !== null ? breakEvenRevenue / daysInMonth : null,
    progress:
      breakEvenRevenue && breakEvenRevenue > 0
        ? figures.grossRevenue / breakEvenRevenue
        : null,
  };
}

export function buildIncomeStatement(
  current: IncomeStatementData,
  previous: IncomeStatementData,
  monthKey: string,
): IncomeStatement {
  const currentFigures = toFigures(current);
  const previousFigures = toFigures(previous);
  const revenue = currentFigures.grossRevenue;
  const cmv = goodsCost(currentFigures).amount;
  const cmo = currentFigures.groups.personnel.amount;
  const income = netIncome(currentFigures);

  return {
    lines: LINE_DEFINITIONS.map((definition) => {
      const values = definition.getValues(currentFigures);
      return {
        id: definition.id,
        label: definition.label,
        kind: definition.kind,
        amount: values.amount,
        previousAmount: definition.getValues(previousFigures).amount,
        details: values.details,
      };
    }),
    investments: {
      id: "investments",
      label: "Investimentos (fora do resultado)",
      kind: "deduction",
      amount: currentFigures.groups.investment.amount,
      previousAmount: previousFigures.groups.investment.amount,
      details: currentFigures.groups.investment.details,
    },
    grossRevenue: revenue,
    netIncome: income,
    indicators: [
      buildIndicator("cmv", "CMV", cmv, revenue, CMV_BENCHMARK),
      buildIndicator("cmo", "CMO · mão de obra", cmo, revenue, CMO_BENCHMARK),
      buildIndicator(
        "prime-cost",
        "Prime cost (CMV + CMO)",
        cmv + cmo,
        revenue,
        PRIME_COST_BENCHMARK,
      ),
      buildIndicator(
        "occupancy",
        "Ocupação",
        currentFigures.groups.occupancy.amount,
        revenue,
        OCCUPANCY_BENCHMARK,
      ),
    ],
    breakEven: buildBreakEven(currentFigures, monthKey),
    usesRecipeCost: currentFigures.usesRecipeCost,
    itemsWithoutCost: current.itemsWithoutCost,
    orderCount: current.orderCount,
  };
}
