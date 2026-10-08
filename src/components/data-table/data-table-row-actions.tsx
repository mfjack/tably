import { Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { DataTableRowActionButton } from "./data-table-row-action-button";

type DataTableRowActionsProps = {
  itemLabel: string;
  onEdit?: () => void;
  onDelete?: () => void;
  children?: ReactNode;
};

export function DataTableRowActions({
  itemLabel,
  onEdit,
  onDelete,
  children,
}: DataTableRowActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      {children}
      {onEdit && (
        <DataTableRowActionButton
          label="Editar"
          accessibleLabel={`Editar ${itemLabel}`}
          icon={Pencil}
          onClick={onEdit}
        />
      )}
      {onDelete && (
        <DataTableRowActionButton
          label="Excluir"
          accessibleLabel={`Excluir ${itemLabel}`}
          icon={Trash2}
          variant="destructive"
          onClick={onDelete}
        />
      )}
    </div>
  );
}
