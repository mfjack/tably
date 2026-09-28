"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DataTableRowActionsProps = {
  itemLabel: string;
  onEdit: () => void;
  onDelete: () => void;
};

export function DataTableRowActions({
  itemLabel,
  onEdit,
  onDelete,
}: DataTableRowActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon-lg"
              aria-label={`Editar ${itemLabel}`}
              className="shadow-xs"
              onClick={onEdit}
            />
          }
        >
          <Pencil aria-hidden />
        </TooltipTrigger>
        <TooltipContent>Editar</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="destructive"
              size="icon-lg"
              aria-label={`Excluir ${itemLabel}`}
              onClick={onDelete}
            />
          }
        >
          <Trash2 aria-hidden />
        </TooltipTrigger>
        <TooltipContent>Excluir</TooltipContent>
      </Tooltip>
    </div>
  );
}
