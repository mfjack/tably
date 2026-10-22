import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const statValueVariants = cva(
  "truncate font-bold text-xl tabular-nums tracking-tight",
  {
    variants: {
      tone: {
        default: "",
        good: "text-emerald-600 dark:text-emerald-400",
        attention: "text-warning",
        bad: "text-destructive",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

export type StatTone = NonNullable<
  VariantProps<typeof statValueVariants>["tone"]
>;

type StatCardProps = {
  label: string;
  value: string;
  detail?: ReactNode;
  isAlert?: boolean;
  tone?: StatTone;
  className?: string;
};

export function StatCard({
  label,
  value,
  detail,
  isAlert,
  tone,
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
        className={statValueVariants({
          tone: tone ?? (isAlert ? "bad" : "default"),
        })}
      >
        {value}
      </p>
      {detail && <div className="text-muted-foreground text-xs">{detail}</div>}
    </article>
  );
}
