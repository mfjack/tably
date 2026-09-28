"use client";

import type { LucideIcon } from "lucide-react";
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
  onClick: () => void;
};

export function DataTableRowActionButton({
  label,
  accessibleLabel,
  icon: Icon,
  variant = "outline",
  onClick,
}: DataTableRowActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={variant}
            size="icon-lg"
            aria-label={accessibleLabel}
            className={variant === "outline" ? "shadow-xs" : undefined}
            onClick={onClick}
          />
        }
      >
        <Icon aria-hidden />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
