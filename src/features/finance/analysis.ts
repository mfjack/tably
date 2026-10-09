import { addDays, format, parseISO } from "date-fns";

export const PROJECTION_HORIZONS = [30, 60, 90] as const;

export type ProjectionHorizon = (typeof PROJECTION_HORIZONS)[number];

export type DailySchedule = {
  date: string;
  income: number;
  expense: number;
};

export type FinancialAnalysisData = {
  today: string;
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

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function buildCashFlowProjection(
  data: FinancialAnalysisData,
  horizonDays: number,
): CashFlowProjection {
  const scheduledByDate = new Map(data.scheduled.map((day) => [day.date, day]));
  const today = parseISO(data.today);
  let balance = data.balanceToday;

  const points = Array.from({ length: horizonDays + 1 }, (_, index) => {
    const date = toDateKey(addDays(today, index));
    const scheduled = scheduledByDate.get(date);
    const inflow =
      (scheduled?.income ?? 0) + (index === 0 ? data.overdue.income : 0);
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
