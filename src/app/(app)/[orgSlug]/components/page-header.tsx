import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b px-4 py-4 md:px-8">
      <SidebarTrigger className="-ml-1" aria-label="Mostrar ou ocultar menu" />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="font-bold text-xl tracking-[-0.02em]">{title}</h1>
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
