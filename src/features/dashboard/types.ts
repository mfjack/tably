import type { EmployeeId } from "@/features/employees/types";
import type { MeasureUnit } from "@/features/ingredients/types";
import type { AppModuleId } from "@/features/organizations/types";

export type TeamMemberStatus =
  | "working"
  | "finished"
  | "late"
  | "waiting"
  | "off";

export type TeamMember = {
  id: EmployeeId;
  name: string;
  status: TeamMemberStatus;
  expectedStart: string | null;
  lastPunchTime: string | null;
  punchCount: number;
};

export type LowStockItem = {
  name: string;
  unit: MeasureUnit;
  currentStock: number;
  minimumStock: number;
};

export type PendingTask = {
  title: string;
  listName: string;
};

export type TodayDashboard = {
  today: string;
  accessibleModules: AppModuleId[];
  sales: {
    revenue: number;
    orderCount: number;
    lastWeekRevenue: number;
    lastWeekOrderCount: number;
  } | null;
  openOrders: { count: number; total: number } | null;
  kitchen: { preparing: number; ready: number } | null;
  finance: {
    overdueCount: number;
    overdueAmount: number;
    dueTodayCount: number;
    dueTodayAmount: number;
    receivableTodayAmount: number;
  } | null;
  stock: { lowCount: number; items: LowStockItem[] } | null;
  team: TeamMember[] | null;
  tasks: {
    pendingCount: number;
    totalCount: number;
    pending: PendingTask[];
  } | null;
  overdueVacationCount: number | null;
};
