"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type PointerEvent, useId, useMemo, useState } from "react";
import type { ProjectionPoint } from "@/features/finance/analysis";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 240;
const GRID_LINE_COUNT = 4;
const MAX_AXIS_LABELS = 6;
const TOOLTIP_FLIP_RATIO = 0.6;

type CashFlowChartProps = {
  points: readonly ProjectionPoint[];
};

function getNiceStep(range: number): number {
  const roughStep = range / GRID_LINE_COUNT;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep || 1));
  const normalized = roughStep / magnitude;
  const niceFactor =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceFactor * magnitude;
}

function formatAxisCurrency(value: number): string {
  const absoluteValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absoluteValue >= 1000) {
    return `${sign}$ ${(absoluteValue / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  }
  return `${sign}$ ${absoluteValue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export function CashFlowChart({ points }: CashFlowChartProps) {
  const clipId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const scale = useMemo(() => {
    const balances = points.map((point) => point.balance);
    const rawMin = Math.min(0, ...balances);
    const rawMax = Math.max(0, ...balances);
    const step = getNiceStep(rawMax - rawMin || 1);
    const min = Math.floor(rawMin / step) * step;
    const max = Math.ceil(rawMax / step) * step || step;
    const ticks: number[] = [];
    for (let tick = min; tick <= max + step / 2; tick += step) ticks.push(tick);
    return { min, max, ticks };
  }, [points]);

  const toX = (index: number) =>
    points.length > 1 ? (index / (points.length - 1)) * CHART_WIDTH : 0;
  const toY = (value: number) =>
    CHART_HEIGHT -
    ((value - scale.min) / (scale.max - scale.min)) * CHART_HEIGHT;
  const zeroY = toY(0);

  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${toX(index)},${toY(point.balance)}`,
    )
    .join(" ");
  const areaPath = `${linePath} L${toX(points.length - 1)},${zeroY} L0,${zeroY} Z`;
  const labelStep = Math.max(1, Math.ceil(points.length / MAX_AXIS_LABELS));
  const activePoint = activeIndex !== null ? points[activeIndex] : null;

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;
    const index = Math.round(ratio * (points.length - 1));
    setActiveIndex(Math.min(points.length - 1, Math.max(0, index)));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
        <div className="relative h-60 text-muted-foreground text-xs tabular-nums">
          {scale.ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${(toY(tick) / CHART_HEIGHT) * 100}%` }}
            >
              {formatAxisCurrency(tick)}
            </span>
          ))}
        </div>
        <div
          role="img"
          aria-label="Saldo projetado por dia"
          className="relative h-60 touch-none"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          onPointerLeave={() => setActiveIndex(null)}
        >
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
            aria-hidden
          >
            <defs>
              <clipPath id={`${clipId}-above`}>
                <rect x="0" y="0" width={CHART_WIDTH} height={zeroY} />
              </clipPath>
              <clipPath id={`${clipId}-below`}>
                <rect
                  x="0"
                  y={zeroY}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT - zeroY}
                />
              </clipPath>
            </defs>
            {scale.ticks.map((tick) => (
              <line
                key={tick}
                x1="0"
                x2={CHART_WIDTH}
                y1={toY(tick)}
                y2={toY(tick)}
                className={cn(
                  tick === 0 ? "stroke-foreground/40" : "stroke-border",
                )}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path
              d={areaPath}
              className="fill-foreground/5"
              clipPath={`url(#${clipId}-above)`}
            />
            <path
              d={areaPath}
              className="fill-destructive/10"
              clipPath={`url(#${clipId}-below)`}
            />
            <path
              d={linePath}
              fill="none"
              className="stroke-foreground"
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              clipPath={`url(#${clipId}-above)`}
            />
            <path
              d={linePath}
              fill="none"
              className="stroke-destructive"
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              clipPath={`url(#${clipId}-below)`}
            />
          </svg>

          {activePoint && activeIndex !== null && (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-px bg-foreground/30"
                style={{ left: `${(toX(activeIndex) / CHART_WIDTH) * 100}%` }}
              />
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background",
                  activePoint.balance < 0 ? "bg-destructive" : "bg-foreground",
                )}
                style={{
                  left: `${(toX(activeIndex) / CHART_WIDTH) * 100}%`,
                  top: `${(toY(activePoint.balance) / CHART_HEIGHT) * 100}%`,
                }}
              />
              <div
                role="status"
                className={cn(
                  "pointer-events-none absolute top-2 z-10 flex min-w-44 flex-col gap-1 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md",
                  activeIndex / points.length > TOOLTIP_FLIP_RATIO
                    ? "-translate-x-[calc(100%+0.75rem)]"
                    : "translate-x-3",
                )}
                style={{ left: `${(toX(activeIndex) / CHART_WIDTH) * 100}%` }}
              >
                <span className="font-medium first-letter:uppercase">
                  {format(parseISO(activePoint.date), "EEEE, dd/MM", {
                    locale: ptBR,
                  })}
                </span>
                <span className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Saldo</span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      activePoint.balance < 0 && "text-destructive",
                    )}
                  >
                    {formatCurrency(activePoint.balance)}
                  </span>
                </span>
                {activePoint.inflow > 0 && (
                  <span className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Entradas</span>
                    <span className="tabular-nums">
                      +{formatCurrency(activePoint.inflow)}
                    </span>
                  </span>
                )}
                {activePoint.outflow > 0 && (
                  <span className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Saídas</span>
                    <span className="tabular-nums">
                      -{formatCurrency(activePoint.outflow)}
                    </span>
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
        <span />
        <div className="relative h-4 text-muted-foreground text-xs">
          {points.map((point, index) =>
            index % labelStep === 0 ? (
              <span
                key={point.date}
                className={cn(
                  "absolute whitespace-nowrap tabular-nums",
                  index === 0
                    ? ""
                    : index === points.length - 1
                      ? "-translate-x-full"
                      : "-translate-x-1/2",
                )}
                style={{ left: `${(toX(index) / CHART_WIDTH) * 100}%` }}
              >
                {format(parseISO(point.date), "dd/MM")}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
