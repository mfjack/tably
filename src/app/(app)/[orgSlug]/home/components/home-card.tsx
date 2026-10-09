import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ScrollableCard } from "@/components/scrollable-card";
import { cn } from "@/lib/utils";

const HOME_CARD_TONE_CLASS_NAMES = {
  attention: "bg-warning/10 text-warning",
  urgent: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
} as const;

export type HomeCardTone = keyof typeof HOME_CARD_TONE_CLASS_NAMES;

export type HomeCardRow = {
  id: string;
  label: string;
  detail?: string;
  value?: string;
  isHighlighted?: boolean;
  leading?: ReactNode;
  action?: ReactNode;
};

type HomeCardProps = {
  icon: LucideIcon;
  title: string;
  summary: string;
  href: string;
  tone: HomeCardTone;
  rows: readonly HomeCardRow[];
  footer?: ReactNode;
};

function HomeCardRowItem({ row }: { row: HomeCardRow }) {
  return (
    <li className="flex items-center gap-3 py-2">
      {row.leading}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm">{row.label}</span>
        {row.detail && (
          <span
            className={cn(
              "truncate text-xs",
              row.isHighlighted
                ? "font-medium text-destructive"
                : "text-muted-foreground",
            )}
          >
            {row.detail}
          </span>
        )}
      </div>
      {row.value && (
        <span className="shrink-0 font-medium text-sm tabular-nums">
          {row.value}
        </span>
      )}
      {row.action}
    </li>
  );
}

export function HomeCard({
  icon: Icon,
  title,
  summary,
  href,
  tone,
  rows,
  footer,
}: HomeCardProps) {
  return (
    <ScrollableCard
      header={
        <Link href={href} className="group flex items-center gap-3">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-xl",
              HOME_CARD_TONE_CLASS_NAMES[tone],
            )}
          >
            <Icon className="size-6" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="font-semibold text-base group-hover:underline">
              {title}
            </h2>
            <span className="text-muted-foreground text-sm">{summary}</span>
          </div>
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      }
      footer={
        footer && (
          <div className="flex items-center justify-between gap-3 border-t pt-3 text-muted-foreground text-xs">
            {footer}
          </div>
        )
      }
    >
      <ul className="flex flex-col divide-y">
        {rows.map((row) => (
          <HomeCardRowItem key={row.id} row={row} />
        ))}
      </ul>
    </ScrollableCard>
  );
}
