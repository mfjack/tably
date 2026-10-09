import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  detail?: ReactNode;
  isAlert?: boolean;
  className?: string;
};

export function StatCard({
  label,
  value,
  detail,
  isAlert,
  className,
}: StatCardProps) {
  return (
    <article
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-2xl border bg-card p-4",
        className,
      )}
    >
      <h3 className="text-muted-foreground text-xs">{label}</h3>
      <p
        className={cn(
          "truncate font-bold text-xl tabular-nums tracking-tight",
          isAlert && "text-destructive",
        )}
      >
        {value}
      </p>
      {detail && <div className="text-muted-foreground text-xs">{detail}</div>}
    </article>
  );
}
