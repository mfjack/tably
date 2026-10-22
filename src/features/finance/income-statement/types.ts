import type { DreGroup, FinancialEntryKind } from "../types";

export type IncomeStatementCategory = {
  name: string;
  kind: FinancialEntryKind;
  group: DreGroup;
  amount: number;
};

export type IncomeStatementData = {
  grossSales: number;
  cardFees: number;
  orderCount: number;
  recipeCost: number;
  itemsWithoutCost: number;
  categories: IncomeStatementCategory[];
};

export type IncomeStatementPeriods = {
  monthKey: string;
  previousMonthKey: string;
  current: IncomeStatementData;
  previous: IncomeStatementData;
};

export type StatementLineKind = "revenue" | "deduction" | "subtotal" | "result";

export type StatementLineDetail = {
  label: string;
  amount: number;
};

export type StatementLine = {
  id: string;
  label: string;
  kind: StatementLineKind;
  amount: number;
  previousAmount: number;
  details: StatementLineDetail[];
};

export type BenchmarkStatus = "good" | "attention" | "bad" | "none";

export type StatementIndicator = {
  id: string;
  label: string;
  percent: number | null;
  amount: number;
  target: string;
  status: BenchmarkStatus;
};

export type BreakEvenAnalysis = {
  fixedCosts: number;
  contributionMargin: number | null;
  breakEvenRevenue: number | null;
  dailyTarget: number | null;
  progress: number | null;
};

export type IncomeStatement = {
  lines: StatementLine[];
  investments: StatementLine;
  grossRevenue: number;
  netIncome: number;
  indicators: StatementIndicator[];
  breakEven: BreakEvenAnalysis;
  usesRecipeCost: boolean;
  itemsWithoutCost: number;
  orderCount: number;
};
