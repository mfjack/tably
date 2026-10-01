import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type StatusMessageProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action: ReactNode;
};

export function StatusMessage({
  icon: Icon,
  title,
  description,
  action,
}: StatusMessageProps) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="font-semibold text-xl">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}
