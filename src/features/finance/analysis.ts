import { addDays, format, getDaysInMonth, parseISO } from "date-fns";

export const CARD_FEES_CATEGORY = "Taxas de cartão";
export const SUPPLIES_CATEGORY = "Insumos e mercadorias";
export const PACKAGING_CATEGORY = "Embalagens";

export const PROJECTION_HORIZONS = [30, 60, 90] as const;

export type ProjectionHorizon = (typeof PROJECTION_HORIZONS)[number];

export type CategoryAmount = {
  name: string;
  amount: number;
};

export type DailySchedule = {
  date: string;
  income: number;
  expense: number;
};

export type FinancialAnalysisData = {
  today: string;
  sales: {
    revenue: number;
    orderCount: number;
    cost: number;
    itemsWithoutCost: number;
  };
  salesToday: number;
  averageDailySales: number;
  expensesByCategory: CategoryAmount[];
  otherIncome: number;
  balanceToday: number;
  overdue: { income: number; expense: number };
  scheduled: DailySchedule[];
};

export type ProjectionPoint = {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
};

export type CashFlowProjection = {
  points: ProjectionPoint[];
  lowestPoint: ProjectionPoint;
  firstNegativeDate: string | null;
  endingBalance: number;
};

export type IncomeStatement = {
  revenue: number;
  cardFees: number;
  goodsCost: number;
  goodsCostSource: "recipes" | "purchases";
  grossProfit: number;
  operatingExpenses: CategoryAmount[];
  operatingExpensesTotal: number;
  otherIncome: number;
  result: number;
};

export type BreakEven = {
  fixedCosts: number;
  contributionRatio: number | null;
  breakEvenRevenue: number | null;
  dailyTarget: number | null;
  progress: number | null;
};

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function findCategoryAmount(
  categories: readonly CategoryAmount[],
  name: string,
): number {
  return categories.find((category) => category.name === name)?.amount ?? 0;
}

export function buildCashFlowProjection(
  data: FinancialAnalysisData,
  horizonDays: number,
  includesExpectedSales: boolean,
): CashFlowProjection {
  const scheduledByDate = new Map(data.scheduled.map((day) => [day.date, day]));
  const today = parseISO(data.today);
  let balance = data.balanceToday;

  const points = Array.from({ length: horizonDays + 1 }, (_, index) => {
    const date = toDateKey(addDays(today, index));
    const scheduled = scheduledByDate.get(date);
    const expectedSales =
      includesExpectedSales && index > 0 ? data.averageDailySales : 0;
    const inflow =
      (scheduled?.income ?? 0) +
      expectedSales +
      (index === 0 ? data.overdue.income : 0);
    const outflow =
      (scheduled?.expense ?? 0) + (index === 0 ? data.overdue.expense : 0);
    balance += inflow - outflow;
    return { date, inflow, outflow, balance };
  });

  const lowestPoint = points.reduce((lowest, point) =>
    point.balance < lowest.balance ? point : lowest,
  );

  return {
    points,
    lowestPoint,
    firstNegativeDate: points.find((point) => point.balance < 0)?.date ?? null,
    endingBalance: points[points.length - 1]?.balance ?? data.balanceToday,
  };
}

export function buildIncomeStatement(
  data: FinancialAnalysisData,
): IncomeStatement {
  const cardFees = findCategoryAmount(
    data.expensesByCategory,
    CARD_FEES_CATEGORY,
  );
  const supplies = findCategoryAmount(
    data.expensesByCategory,
    SUPPLIES_CATEGORY,
  );
  const usesRecipes = data.sales.cost > 0;
  const goodsCost = usesRecipes ? data.sales.cost : supplies;
  const operatingExpenses = data.expensesByCategory.filter(
    (category) =>
      category.name !== CARD_FEES_CATEGORY &&
      category.name !== SUPPLIES_CATEGORY,
  );
  const operatingExpensesTotal = operatingExpenses.reduce(
    (total, category) => total + category.amount,
    0,
  );
  const grossProfit = data.sales.revenue - cardFees - goodsCost;

  return {
    revenue: data.sales.revenue,
    cardFees,
    goodsCost,
    goodsCostSource: usesRecipes ? "recipes" : "purchases",
    grossProfit,
    operatingExpenses,
    operatingExpensesTotal,
    otherIncome: data.otherIncome,
    result: grossProfit - operatingExpensesTotal + data.otherIncome,
  };
}

export function buildBreakEven(
  statement: IncomeStatement,
  data: FinancialAnalysisData,
  monthKey: string,
): BreakEven {
  const packaging = findCategoryAmount(
    data.expensesByCategory,
    PACKAGING_CATEGORY,
  );
  const variableCosts = statement.goodsCost + statement.cardFees + packaging;
  const fixedCosts = statement.operatingExpensesTotal - packaging;
  const contributionRatio =
    statement.revenue > 0
      ? (statement.revenue - variableCosts) / statement.revenue
      : null;
  const breakEvenRevenue =
    contributionRatio && contributionRatio > 0
      ? fixedCosts / contributionRatio
      : null;
  const daysInMonth = getDaysInMonth(parseISO(`${monthKey}-01`));

  return {
    fixedCosts,
    contributionRatio,
    breakEvenRevenue,
    dailyTarget:
      breakEvenRevenue !== null ? breakEvenRevenue / daysInMonth : null,
    progress:
      breakEvenRevenue && breakEvenRevenue > 0
        ? statement.revenue / breakEvenRevenue
        : null,
  };
}
