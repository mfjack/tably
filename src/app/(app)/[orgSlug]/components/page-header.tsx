import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex shrink-0 items-center gap-3 bg-background px-4 pt-7 pb-1 md:px-6">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className="truncate">
          <SidebarTrigger
            className="h-auto w-fit max-w-full justify-start p-0 font-bold text-[1.375rem] leading-7 tracking-[-0.02em] hover:bg-transparent"
            aria-label={`Abrir menu: ${title}`}
          >
            <span className="truncate">{title}</span>
          </SidebarTrigger>
        </h1>
        {description && (
          <p className="truncate text-muted-foreground text-sm">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </header>
  );
}
