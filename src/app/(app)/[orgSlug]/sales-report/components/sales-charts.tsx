import { format, getISODay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock } from "lucide-react";
import {
  formatHour,
  formatHourRange,
  formatWeekday,
  getHourlySeries,
  getPeak,
  hasWeekdayChart,
} from "@/features/sales-report/report-metrics";
import type { SalesReport } from "@/features/sales-report/types";
import { formatCurrency } from "@/lib/format";
import { type ReportBar, ReportBarChart } from "./report-bar-chart";
import { ReportSection } from "./report-section";

type SalesChartsProps = {
  report: SalesReport;
};

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}

function formatDayLabel(date: string, pattern: string) {
  return capitalize(format(parseISO(date), pattern, { locale: ptBR }));
}

function formatOrderCount(orderCount: number) {
  return `${orderCount} ${orderCount === 1 ? "pedido" : "pedidos"}`;
}

type PeakSummaryProps = {
  label: string;
  value: string;
  revenue: number;
  orderCount: number;
};

function PeakSummary({ label, value, revenue, orderCount }: PeakSummaryProps) {
  return (
    <p className="text-muted-foreground text-sm">
      {label} <strong className="font-semibold text-foreground">{value}</strong>{" "}
      · <span className="tabular-nums">{formatCurrency(revenue)}</span> ·{" "}
      {formatOrderCount(orderCount)}
    </p>
  );
}

function DailySalesSection({ report }: SalesChartsProps) {
  const peakDay = getPeak(report.byDay);
  const bars: ReportBar[] = report.byDay.map((day) => ({
    key: day.date,
    axisLabel:
      report.byDay.length <= 7
        ? formatWeekday(getISODay(parseISO(day.date))).slice(0, 3)
        : formatDayLabel(day.date, "dd/MM"),
    tooltipLabel: formatDayLabel(day.date, "EEEE, dd/MM"),
    revenue: day.revenue,
    orderCount: day.orderCount,
  }));

  return (
    <ReportSection title="Faturamento por dia" icon={CalendarDays}>
      {peakDay && (
        <PeakSummary
          label="Melhor dia:"
          value={formatDayLabel(peakDay.date, "EEEE, dd/MM")}
          revenue={peakDay.revenue}
          orderCount={peakDay.orderCount}
        />
      )}
      <ReportBarChart bars={bars} highlightedKey={peakDay?.date ?? null} />
    </ReportSection>
  );
}

function HourlySalesSection({ report }: SalesChartsProps) {
  const hourlySeries = getHourlySeries(report);
  const peakHour = getPeak(hourlySeries);
  const bars: ReportBar[] = hourlySeries.map((entry) => ({
    key: entry.hour.toString(),
    axisLabel: formatHour(entry.hour),
    tooltipLabel: formatHourRange(entry.hour),
    revenue: entry.revenue,
    orderCount: entry.orderCount,
  }));

  return (
    <ReportSection title="Vendas por horário" icon={Clock}>
      {peakHour && (
        <PeakSummary
          label="Pico:"
          value={formatHourRange(peakHour.hour)}
          revenue={peakHour.revenue}
          orderCount={peakHour.orderCount}
        />
      )}
      <ReportBarChart
        bars={bars}
        highlightedKey={peakHour ? peakHour.hour.toString() : null}
      />
    </ReportSection>
  );
}

function WeekdaySalesSection({ report }: SalesChartsProps) {
  const peakWeekday = getPeak(report.byWeekday);
  const bars: ReportBar[] = report.byWeekday.map((entry) => ({
    key: entry.weekday.toString(),
    axisLabel: formatWeekday(entry.weekday).slice(0, 3),
    tooltipLabel: formatWeekday(entry.weekday),
    revenue: entry.revenue,
    orderCount: entry.orderCount,
  }));

  return (
    <ReportSection title="Vendas por dia da semana" icon={CalendarDays}>
      {peakWeekday && (
        <PeakSummary
          label="Dia mais forte:"
          value={formatWeekday(peakWeekday.weekday)}
          revenue={peakWeekday.revenue}
          orderCount={peakWeekday.orderCount}
        />
      )}
      <ReportBarChart
        bars={bars}
        highlightedKey={peakWeekday ? peakWeekday.weekday.toString() : null}
      />
    </ReportSection>
  );
}

export function SalesCharts({ report }: SalesChartsProps) {
  const showsDailyChart = report.byDay.length > 1;
  const showsWeekdayChart = hasWeekdayChart(report);

  return (
    <>
      {showsDailyChart && <DailySalesSection report={report} />}
      <div
        className={
          showsWeekdayChart ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"
        }
      >
        <HourlySalesSection report={report} />
        {showsWeekdayChart && <WeekdaySalesSection report={report} />}
      </div>
    </>
  );
}
