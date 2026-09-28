import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b px-4 py-4 md:px-8">
      <SidebarTrigger className="-ml-1" aria-label="Mostrar ou ocultar menu" />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex flex-col">
        <h1 className="font-bold text-xl tracking-[-0.02em]">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
    </header>
  );
}
