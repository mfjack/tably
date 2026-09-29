"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChartColumn } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OrganizationId } from "@/features/organizations/types";
import { useSalesReportQuery } from "@/features/sales-report/hooks/use-sales-report-query";
import {
  DEFAULT_SALES_REPORT_PERIOD,
  isSalesReportPeriod,
  SALES_REPORT_PERIOD_LABELS,
  SALES_REPORT_PERIODS,
} from "@/features/sales-report/periods";
import type {
  SalesReport,
  SalesReportPeriod,
} from "@/features/sales-report/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { KpiCard } from "./kpi-card";
import { PaymentMethodsBreakdown } from "./payment-methods-breakdown";
import { ReportSection } from "./report-section";
import { RevenueByDayChart } from "./revenue-by-day-chart";
import { TopProductsTable } from "./top-products-table";

const KPI_CARD_COUNT = 4;

type SalesReportViewProps = {
  organizationId: OrganizationId;
  title: string;
};

function getChange(current: number, previous: number) {
  return previous > 0 ? (current - previous) / previous : null;
}

function formatPeriodRange(report: SalesReport) {
  if (report.startDate === report.endDate) {
    return format(parseISO(report.startDate), "EEEE, d 'de' MMMM", {
      locale: ptBR,
    });
  }
  return `${format(parseISO(report.startDate), "dd/MM")} a ${format(parseISO(report.endDate), "dd/MM/yyyy")}`;
}

function SalesReportSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: KPI_CARD_COUNT }, (_, cardIndex) => (
          <Skeleton
            key={`kpi-${cardIndex.toString()}`}
            className="h-32 rounded-2xl"
          />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

type SalesReportContentProps = {
  report: SalesReport;
};

function SalesReportContent({ report }: SalesReportContentProps) {
  const { summary, previousSummary } = report;
  const averageTicket =
    summary.orderCount > 0 ? summary.revenue / summary.orderCount : 0;
  const grossProfit = summary.revenue - summary.cost;
  const hasCost = summary.cost > 0;

  if (summary.orderCount === 0) {
    return (
      <Empty className="flex-1 border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ChartColumn aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Nenhuma venda nesse período</EmptyTitle>
          <EmptyDescription>
            As vendas aparecem aqui assim que os pedidos são pagos.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Faturamento"
          value={formatCurrency(summary.revenue)}
          change={getChange(summary.revenue, previousSummary.revenue)}
          detail={`${summary.itemCount} ${summary.itemCount === 1 ? "item vendido" : "itens vendidos"}`}
        />
        <KpiCard
          label="Pedidos"
          value={summary.orderCount.toString()}
          change={getChange(summary.orderCount, previousSummary.orderCount)}
        />
        <KpiCard label="Ticket médio" value={formatCurrency(averageTicket)} />
        <KpiCard
          label="Lucro bruto"
          value={hasCost ? formatCurrency(grossProfit) : "—"}
          detail={
            hasCost
              ? `CMV ${formatPercent(summary.cost / summary.revenue)}`
              : "Cadastre o custo dos insumos"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {report.byDay.length > 1 && (
          <ReportSection title="Faturamento por dia">
            <RevenueByDayChart days={report.byDay} />
          </ReportSection>
        )}
        <ReportSection title="Formas de pagamento">
          <PaymentMethodsBreakdown
            payments={report.byPaymentMethod}
            totalRevenue={summary.revenue}
          />
        </ReportSection>
      </div>

      <ReportSection title="Produtos mais vendidos">
        <TopProductsTable products={report.topProducts} />
      </ReportSection>
    </div>
  );
}

export function SalesReportView({
  organizationId,
  title,
}: SalesReportViewProps) {
  const [period, setPeriod] = useState<SalesReportPeriod>(
    DEFAULT_SALES_REPORT_PERIOD,
  );
  const salesReportQuery = useSalesReportQuery(organizationId, period);
  const report = salesReportQuery.data;

  return (
    <>
      <PageHeader
        title={title}
        description={report ? formatPeriodRange(report) : undefined}
      />
      <PageContent>
        <div className="flex flex-col gap-6">
          <Tabs
            value={period}
            onValueChange={(value: string) => {
              if (isSalesReportPeriod(value)) setPeriod(value);
            }}
          >
            <TabsList className="h-auto flex-wrap group-data-horizontal/tabs:h-auto">
              {SALES_REPORT_PERIODS.map((periodOption) => (
                <TabsTrigger
                  key={periodOption}
                  value={periodOption}
                  className="h-9 px-4"
                >
                  {SALES_REPORT_PERIOD_LABELS[periodOption]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {salesReportQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {salesReportQuery.error.message}
              </AlertDescription>
            </Alert>
          ) : report ? (
            <div
              aria-busy={salesReportQuery.isFetching}
              className={cn(
                "transition-opacity",
                salesReportQuery.isPlaceholderData && "opacity-60",
              )}
            >
              <SalesReportContent report={report} />
            </div>
          ) : (
            <SalesReportSkeleton />
          )}
        </div>
      </PageContent>
    </>
  );
}
