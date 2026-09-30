"use client";

import {
  ArrowRight,
  Banknote,
  ChefHat,
  ClipboardList,
  ListChecks,
  Package,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTodayDashboardQuery } from "@/features/dashboard/hooks/use-today-dashboard-query";
import type {
  TeamMember,
  TeamMemberStatus,
  TodayDashboard,
} from "@/features/dashboard/types";
import { formatItemQuantity } from "@/features/ingredients/shopping-list";
import { buildOrganizationPath } from "@/features/modules/app-modules";
import type {
  AppModuleId,
  OrganizationId,
} from "@/features/organizations/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { PosHeaderDescription } from "../../pos/components/pos-header-description";

const MODULE_PATHS = {
  sales_report: "sales-report",
  order_tabs: "order-tabs",
  kitchen: "kitchen",
  finance: "finance",
  ingredients: "ingredients",
  employees: "employees",
  tasks: "tasks",
  payroll: "payroll",
} as const satisfies Partial<Record<AppModuleId, string>>;

type LinkedModule = keyof typeof MODULE_PATHS;

const TEAM_STATUS_LABELS = {
  working: "Trabalhando",
  finished: "Encerrou",
  late: "Não chegou",
  waiting: "Aguardando",
  off: "Folga",
} as const satisfies Record<TeamMemberStatus, string>;

type TodayViewProps = {
  organizationId: OrganizationId;
  organizationSlug: string;
  title: string;
};

type DashboardCardProps = {
  title: string;
  icon: typeof Banknote;
  href: string | null;
  linkLabel: string;
  children: ReactNode;
};

function DashboardCard({
  title,
  icon: Icon,
  href,
  linkLabel,
  children,
}: DashboardCardProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon aria-hidden className="size-4 text-muted-foreground" />
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
          >
            {linkLabel}
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  isAlert,
}: {
  label: string;
  value: string;
  isAlert?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={cn(
          "font-bold text-xl tabular-nums tracking-tight",
          isAlert && "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SalesCard({
  sales,
  href,
}: {
  sales: NonNullable<TodayDashboard["sales"]>;
  href: string | null;
}) {
  const averageTicket =
    sales.orderCount > 0 ? sales.revenue / sales.orderCount : 0;
  const change =
    sales.lastWeekRevenue > 0
      ? (sales.revenue - sales.lastWeekRevenue) / sales.lastWeekRevenue
      : null;
  const TrendIcon = change !== null && change < 0 ? TrendingDown : TrendingUp;

  return (
    <DashboardCard
      title="Vendas de hoje"
      icon={Banknote}
      href={href}
      linkLabel="Relatório"
    >
      <div className="flex flex-col gap-1">
        <span className="font-bold text-3xl tabular-nums tracking-tight">
          {formatCurrency(sales.revenue)}
        </span>
        <span className="text-muted-foreground text-sm">
          {sales.orderCount} {sales.orderCount === 1 ? "venda" : "vendas"} ·
          ticket médio {formatCurrency(averageTicket)}
        </span>
      </div>
      <p className="flex items-center gap-1.5 text-sm">
        {change === null ? (
          <span className="text-muted-foreground">
            Sem vendas no mesmo dia da semana passada.
          </span>
        ) : (
          <>
            <TrendIcon
              aria-hidden
              className={cn("size-4", change < 0 && "text-destructive")}
            />
            <span className={cn(change < 0 && "text-destructive")}>
              {change >= 0 ? "+" : ""}
              {formatPercent(change)}
            </span>
            <span className="text-muted-foreground">
              vs {formatCurrency(sales.lastWeekRevenue)} na semana passada
            </span>
          </>
        )}
      </p>
    </DashboardCard>
  );
}

function TeamRow({ member }: { member: TeamMember }) {
  const detail =
    member.status === "working" || member.status === "finished"
      ? `Última marcação ${member.lastPunchTime}`
      : member.expectedStart
        ? `Entrada às ${member.expectedStart}`
        : "Sem jornada hoje";
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-sm">{member.name}</span>
        <span className="text-muted-foreground text-xs">{detail}</span>
      </div>
      <Badge
        variant={
          member.status === "late"
            ? "destructive"
            : member.status === "working"
              ? "default"
              : "outline"
        }
      >
        {TEAM_STATUS_LABELS[member.status]}
      </Badge>
    </li>
  );
}

export function TodayView({
  organizationId,
  organizationSlug,
  title,
}: TodayViewProps) {
  const dashboardQuery = useTodayDashboardQuery(organizationId);
  const dashboard = dashboardQuery.data;

  function getHref(moduleId: LinkedModule): string | null {
    if (!dashboard?.accessibleModules.includes(moduleId)) return null;
    return buildOrganizationPath(organizationSlug, MODULE_PATHS[moduleId]);
  }

  const hasAnySection =
    dashboard &&
    [
      dashboard.sales,
      dashboard.openOrders,
      dashboard.finance,
      dashboard.stock,
      dashboard.team,
      dashboard.tasks,
    ].some((section) => section !== null);

  return (
    <>
      <PageHeader title={title} description={<PosHeaderDescription />} />
      <PageContent>
        {dashboardQuery.error ? (
          <Alert variant="destructive">
            <AlertDescription>{dashboardQuery.error.message}</AlertDescription>
          </Alert>
        ) : !dashboard ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton
                key={`today-card-${index.toString()}`}
                className="h-44 rounded-2xl"
              />
            ))}
          </div>
        ) : !hasAnySection ? (
          <p className="py-12 text-center text-muted-foreground text-sm">
            Nenhum resumo disponível para as páginas liberadas para você.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {dashboard.overdueVacationCount !== null &&
              dashboard.overdueVacationCount > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {dashboard.overdueVacationCount}{" "}
                    {dashboard.overdueVacationCount === 1
                      ? "funcionário está"
                      : "funcionários estão"}{" "}
                    com férias vencidas. Férias fora do prazo são pagas em
                    dobro.{" "}
                    {getHref("payroll") && (
                      <Link
                        href={getHref("payroll") ?? ""}
                        className="font-medium underline"
                      >
                        Programar férias
                      </Link>
                    )}
                  </AlertDescription>
                </Alert>
              )}

            <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.sales && (
                <SalesCard
                  sales={dashboard.sales}
                  href={getHref("sales_report")}
                />
              )}

              {dashboard.openOrders && dashboard.kitchen && (
                <DashboardCard
                  title="Em andamento"
                  icon={ClipboardList}
                  href={getHref("order_tabs")}
                  linkLabel="Comandas"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <Metric
                      label="Comandas abertas"
                      value={String(dashboard.openOrders.count)}
                    />
                    <Metric
                      label="Valor em aberto"
                      value={formatCurrency(dashboard.openOrders.total)}
                    />
                    <Metric
                      label="Na cozinha"
                      value={String(dashboard.kitchen.preparing)}
                    />
                    <Metric
                      label="Prontos para entregar"
                      value={String(dashboard.kitchen.ready)}
                      isAlert={dashboard.kitchen.ready > 0}
                    />
                  </div>
                  {getHref("kitchen") && (
                    <Link
                      href={getHref("kitchen") ?? ""}
                      className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
                    >
                      <ChefHat aria-hidden className="size-3.5" />
                      Abrir cozinha
                    </Link>
                  )}
                </DashboardCard>
              )}

              {dashboard.finance && (
                <DashboardCard
                  title="Contas"
                  icon={Banknote}
                  href={getHref("finance")}
                  linkLabel="Financeiro"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <Metric
                      label={`Atrasadas (${dashboard.finance.overdueCount})`}
                      value={formatCurrency(dashboard.finance.overdueAmount)}
                      isAlert={dashboard.finance.overdueCount > 0}
                    />
                    <Metric
                      label={`Vencem hoje (${dashboard.finance.dueTodayCount})`}
                      value={formatCurrency(dashboard.finance.dueTodayAmount)}
                    />
                    <Metric
                      label="A receber hoje"
                      value={formatCurrency(
                        dashboard.finance.receivableTodayAmount,
                      )}
                    />
                  </div>
                </DashboardCard>
              )}

              {dashboard.stock && (
                <DashboardCard
                  title="Estoque"
                  icon={Package}
                  href={getHref("ingredients")}
                  linkLabel="Lista de compras"
                >
                  {dashboard.stock.lowCount === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Todos os insumos acima do estoque mínimo.
                    </p>
                  ) : (
                    <>
                      <Metric
                        label="Insumos acabando"
                        value={String(dashboard.stock.lowCount)}
                        isAlert
                      />
                      <ul className="flex flex-col divide-y">
                        {dashboard.stock.items.map((item) => (
                          <li
                            key={item.name}
                            className="flex items-center justify-between gap-3 py-1.5 text-sm"
                          >
                            <span className="truncate">{item.name}</span>
                            <span
                              className={cn(
                                "shrink-0 tabular-nums",
                                item.currentStock <= 0
                                  ? "text-destructive"
                                  : "text-muted-foreground",
                              )}
                            >
                              {formatItemQuantity(item.currentStock, item.unit)}{" "}
                              / mín.{" "}
                              {formatItemQuantity(item.minimumStock, item.unit)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </DashboardCard>
              )}

              {dashboard.team && (
                <DashboardCard
                  title="Equipe hoje"
                  icon={Users}
                  href={getHref("employees")}
                  linkLabel="Funcionários"
                >
                  {dashboard.team.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Nenhum funcionário ativo.
                    </p>
                  ) : (
                    <ul className="flex flex-col divide-y">
                      {dashboard.team.map((member) => (
                        <TeamRow key={member.id} member={member} />
                      ))}
                    </ul>
                  )}
                </DashboardCard>
              )}

              {dashboard.tasks && (
                <DashboardCard
                  title="Tarefas"
                  icon={ListChecks}
                  href={getHref("tasks")}
                  linkLabel="Ver todas"
                >
                  {dashboard.tasks.totalCount === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Nenhuma tarefa cadastrada.
                    </p>
                  ) : dashboard.tasks.pendingCount === 0 ? (
                    <p className="font-medium text-sm">Tudo feito por hoje.</p>
                  ) : (
                    <>
                      <Metric
                        label="Pendentes"
                        value={`${dashboard.tasks.pendingCount} de ${dashboard.tasks.totalCount}`}
                      />
                      <ul className="flex flex-col divide-y">
                        {dashboard.tasks.pending.map((task) => (
                          <li
                            key={`${task.listName}-${task.title}`}
                            className="flex items-center justify-between gap-3 py-1.5 text-sm"
                          >
                            <span className="truncate">{task.title}</span>
                            <span className="shrink-0 text-muted-foreground text-xs">
                              {task.listName}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </DashboardCard>
              )}
            </div>
          </div>
        )}
      </PageContent>
    </>
  );
}
