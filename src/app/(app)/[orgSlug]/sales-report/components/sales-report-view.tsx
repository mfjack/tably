"use client";

import { ChartColumn, TrendingDown, TrendingUp } from "lucide-react";
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
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { useSalesReportQuery } from "@/features/sales-report/hooks/use-sales-report-query";
import {
  DEFAULT_SALES_REPORT_PERIOD,
  isSalesReportPeriod,
  SALES_REPORT_PERIOD_LABELS,
  SALES_REPORT_PERIODS,
} from "@/features/sales-report/periods";
import {
  formatReportPeriod,
  getAverageTicket,
  getBestSellers,
  getChange,
  getCostShare,
  getGrossProfit,
  getWorstSellers,
} from "@/features/sales-report/report-metrics";
import type {
  SalesReport,
  SalesReportPeriod,
} from "@/features/sales-report/types";
import { useSearchParamState } from "@/hooks/use-search-param-state";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { CashSessionsSection } from "./cash-sessions-section";
import { KpiCard } from "./kpi-card";
import { PaymentMethodsSection } from "./payment-methods-section";
import { ProductLookupSection } from "./product-lookup-section";
import { ProductsRankingSection } from "./products-ranking-section";
import { SalesCharts } from "./sales-charts";
import { SalesReportExportMenu } from "./sales-report-export-menu";

const KPI_CARD_COUNT = 4;

type SalesReportViewProps = {
  organizationId: OrganizationId;
  title: string;
  ticketBusiness: OrderTicketBusiness;
};

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
  const { summary, previousSummary, canceled } = report;
  const costShare = getCostShare(summary.cost, summary.revenue);

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
          detail={
            canceled.orderCount > 0
              ? `${canceled.orderCount} ${canceled.orderCount === 1 ? "cancelado" : "cancelados"}`
              : undefined
          }
        />
        <KpiCard
          label="Ticket médio"
          value={formatCurrency(getAverageTicket(report))}
        />
        <KpiCard
          label="Lucro bruto"
          value={
            costShare === null ? "—" : formatCurrency(getGrossProfit(report))
          }
          detail={
            costShare === null
              ? "Cadastre o custo dos insumos"
              : `CMV ${formatPercent(costShare)}`
          }
        />
      </div>

      <ProductLookupSection key={report.startDate} report={report} />
      <PaymentMethodsSection report={report} />

      <SalesCharts report={report} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ProductsRankingSection
          title="Produtos mais vendidos"
          icon={TrendingUp}
          products={getBestSellers(report)}
          emptyMessage="Nenhuma venda neste período."
        />
        <ProductsRankingSection
          title="Produtos menos vendidos"
          icon={TrendingDown}
          products={getWorstSellers(report)}
          emptyMessage="Nenhum produto ativo."
        />
      </div>
    </div>
  );
}

function parseSalesReportPeriod(rawValue: string) {
  return isSalesReportPeriod(rawValue) ? rawValue : null;
}

export function SalesReportView({
  organizationId,
  title,
  ticketBusiness,
}: SalesReportViewProps) {
  const [period, setPeriod] = useSearchParamState<SalesReportPeriod>({
    key: "period",
    defaultValue: DEFAULT_SALES_REPORT_PERIOD,
    parse: parseSalesReportPeriod,
  });
  const salesReportQuery = useSalesReportQuery(organizationId, period);

  function changePeriod(value: string) {
    if (isSalesReportPeriod(value)) setPeriod(value);
  }
  const report = salesReportQuery.data;

  return (
    <>
      <PageHeader
        title={title}
        description={report ? formatReportPeriod(report) : undefined}
        actions={
          <SalesReportExportMenu
            report={salesReportQuery.isPlaceholderData ? undefined : report}
            business={ticketBusiness}
          />
        }
      />
      <PageContent>
        <div className="flex min-h-0 flex-col gap-6">
          <Tabs
            value={period}
            onValueChange={changePeriod}
            className="shrink-0"
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

          <div className="flex min-h-0 flex-col gap-6 overflow-y-auto">
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

            {report && !salesReportQuery.isPlaceholderData && (
              <CashSessionsSection
                organizationId={organizationId}
                ticketBusiness={ticketBusiness}
                startDate={report.startDate}
                endDate={report.endDate}
              />
            )}
          </div>
        </div>
      </PageContent>
    </>
  );
}
