import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DataTableRowActionButtonProps = {
  label: string;
  accessibleLabel: string;
  icon: LucideIcon;
  variant?: "outline" | "destructive";
} & ({ onClick: () => void; href?: never } | { href: string; onClick?: never });

export function DataTableRowActionButton({
  label,
  accessibleLabel,
  icon: Icon,
  variant = "outline",
  onClick,
  href,
}: DataTableRowActionButtonProps) {
  const className = variant === "outline" ? "shadow-xs" : undefined;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          href ? (
            <Button
              variant={variant}
              size="icon-lg"
              aria-label={accessibleLabel}
              className={className}
              nativeButton={false}
              render={<Link href={href} />}
            />
          ) : (
            <Button
              variant={variant}
              size="icon-lg"
              aria-label={accessibleLabel}
              className={className}
              onClick={onClick}
            />
          )
        }
      >
        <Icon aria-hidden />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
