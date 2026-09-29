import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type ReportSectionProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
};

export function ReportSection({
  title,
  description,
  icon: Icon,
  actions,
  children,
}: ReportSectionProps) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="flex items-center gap-2 font-semibold text-base">
            {Icon && (
              <Icon aria-hidden className="size-4 text-muted-foreground" />
            )}
            {title}
          </h2>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
