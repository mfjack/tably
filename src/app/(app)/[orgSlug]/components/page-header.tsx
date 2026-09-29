import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex items-center gap-3 px-4 pt-7 pb-1 md:px-8">
      <SidebarTrigger
        className="-ml-2 md:hidden"
        aria-label="Mostrar ou ocultar menu"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className="truncate font-bold text-[22px] leading-7 tracking-[-0.02em]">
          {title}
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
