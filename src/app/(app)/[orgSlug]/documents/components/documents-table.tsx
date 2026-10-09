"use client";

import { FileImage, FileText, Pencil, Trash2 } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import { DataTableRowActionButton } from "@/components/data-table/data-table-row-action-button";
import { useDataTable } from "@/components/data-table/use-data-table";
import { Badge } from "@/components/ui/badge";
import {
  DOCUMENT_EXPIRY_WARNING_DAYS,
  formatFileSize,
} from "@/features/documents/document-files";
import { DOCUMENT_KIND_LABELS } from "@/features/documents/document-kinds";
import type { OrganizationDocument } from "@/features/documents/types";
import { getExpiryStatus } from "@/lib/expiry";
import { formatDateKey } from "@/lib/format";

const EMPTY_DOCUMENTS: OrganizationDocument[] = [];

const columnHelper = createDataTableColumnHelper<OrganizationDocument>();

type DocumentsTableProps = {
  documents: OrganizationDocument[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  canManage: boolean;
  emptyState: ReactNode;
  onOpen: (document: OrganizationDocument) => void;
  onEdit: (document: OrganizationDocument) => void;
  onDelete: (document: OrganizationDocument) => void;
};

function getDocumentRowId(document: OrganizationDocument) {
  return document.id;
}

function ExpiryBadge({ expiresOn }: { expiresOn: string | null }) {
  if (!expiresOn) return <span className="text-muted-foreground">—</span>;

  const expiry = getExpiryStatus(expiresOn, DOCUMENT_EXPIRY_WARNING_DAYS);
  if (expiry.status === "expired") {
    return (
      <Badge variant="destructive">Venceu em {formatDateKey(expiresOn)}</Badge>
    );
  }
  if (expiry.status === "expiring") {
    return (
      <Badge variant="outline" className="border-warning/40 text-warning">
        {expiry.daysLeft === 0
          ? "Vence hoje"
          : `Vence em ${expiry.daysLeft} ${expiry.daysLeft === 1 ? "dia" : "dias"}`}
      </Badge>
    );
  }
  return <span>{formatDateKey(expiresOn)}</span>;
}

export function DocumentsTable({
  documents,
  isLoading,
  errorMessage,
  canManage,
  emptyState,
  onOpen,
  onEdit,
  onDelete,
}: DocumentsTableProps) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: "Documento",
          cell: ({ row }) => {
            const FileIcon = row.original.mimeType.startsWith("image/")
              ? FileImage
              : FileText;
            return (
              <button
                type="button"
                className="flex min-w-0 items-center gap-3 text-left"
                onClick={() => onOpen(row.original)}
              >
                <FileIcon
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium hover:underline">
                    {row.original.name}
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    {row.original.notes ??
                      `${row.original.fileName} · ${formatFileSize(row.original.sizeBytes)}`}
                  </span>
                </span>
              </button>
            );
          },
        }),
        columnHelper.accessor(
          (document) => DOCUMENT_KIND_LABELS[document.kind],
          {
            id: "kind",
            header: "Tipo",
            cell: ({ getValue }) => (
              <span className="text-muted-foreground">{getValue()}</span>
            ),
          },
        ),
        columnHelper.accessor((document) => document.expiresOn ?? "", {
          id: "expiresOn",
          header: "Validade",
          enableGlobalFilter: false,
          cell: ({ row }) => <ExpiryBadge expiresOn={row.original.expiresOn} />,
        }),
        columnHelper.display({
          id: "actions",
          header: () => <span className="sr-only">Ações</span>,
          cell: ({ row }) => (
            <div className="flex justify-end gap-2">
              <DataTableRowActionButton
                label="Abrir"
                accessibleLabel={`Abrir ${row.original.name}`}
                icon={FileText}
                onClick={() => onOpen(row.original)}
              />
              {canManage && (
                <>
                  <DataTableRowActionButton
                    label="Editar"
                    accessibleLabel={`Editar ${row.original.name}`}
                    icon={Pencil}
                    onClick={() => onEdit(row.original)}
                  />
                  <DataTableRowActionButton
                    label="Excluir"
                    accessibleLabel={`Excluir ${row.original.name}`}
                    icon={Trash2}
                    variant="destructive"
                    onClick={() => onDelete(row.original)}
                  />
                </>
              )}
            </div>
          ),
        }),
      ]),
    [canManage, onOpen, onEdit, onDelete],
  );

  const table = useDataTable({
    data: documents ?? EMPTY_DOCUMENTS,
    columns,
    getRowId: getDocumentRowId,
  });

  return (
    <DataTable
      table={table}
      searchPlaceholder="Buscar documento"
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyState={emptyState}
    />
  );
}
