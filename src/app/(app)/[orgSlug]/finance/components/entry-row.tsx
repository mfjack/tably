"use client";

import {
  Copy,
  FileText,
  MoreHorizontal,
  PackageOpen,
  Paperclip,
  Pencil,
  Receipt,
  Repeat,
  Trash2,
  Undo2,
} from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getWeekdayShortLabel } from "@/features/employees/work-schedule-labels";
import { ACCEPTED_DOCUMENT_TYPES } from "@/features/finance/documents";
import { useOpenFinancialDocumentMutation } from "@/features/finance/hooks/use-open-financial-document-mutation";
import { useRemoveFinancialEntryDocumentMutation } from "@/features/finance/hooks/use-remove-financial-entry-document-mutation";
import { useUndoFinancialEntryPaymentMutation } from "@/features/finance/hooks/use-undo-financial-entry-payment-mutation";
import { useUploadFinancialDocumentMutation } from "@/features/finance/hooks/use-upload-financial-document-mutation";
import {
  ENTRY_SOURCE_LABELS,
  getEntryStatus,
  getEntryStatusLabel,
  isEditableEntrySource,
  RECURRENCE_FREQUENCY_LABELS,
} from "@/features/finance/labels";
import type { EntryStatus, FinancialEntry } from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";
import { getIsoWeekday } from "@/features/time-clock/time-utils";
import { formatCurrency, formatDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";

type DocumentField = "document" | "receipt";

const STATUS_BADGE_VARIANTS = {
  overdue: "destructive",
  due_today: "outline",
  open: "outline",
  paid: "success",
} as const satisfies Record<EntryStatus, "destructive" | "outline" | "success">;

type EntryRowProps = {
  organizationId: OrganizationId;
  entry: FinancialEntry;
  today: string;
  onPay: (entry: FinancialEntry) => void;
  onEdit: (entry: FinancialEntry) => void;
  onDelete: (entry: FinancialEntry) => void;
};

export function EntryRow({
  organizationId,
  entry,
  today,
  onPay,
  onEdit,
  onDelete,
}: EntryRowProps) {
  const status = getEntryStatus(entry, today);
  const isExpense = entry.kind === "expense";
  const isAutomatic = entry.source !== "manual";
  const isEditable = isEditableEntrySource(entry.source);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFieldRef = useRef<DocumentField>("document");
  const uploadMutation = useUploadFinancialDocumentMutation(organizationId);
  const openMutation = useOpenFinancialDocumentMutation(organizationId);
  const removeDocumentMutation =
    useRemoveFinancialEntryDocumentMutation(organizationId);
  const undoPaymentMutation =
    useUndoFinancialEntryPaymentMutation(organizationId);
  const [, month, day] = entry.dueDate.split("-");

  function pickFile(field: DocumentField) {
    pendingFieldRef.current = field;
    fileInputRef.current?.click();
  }

  function uploadFile(file: File | undefined) {
    if (!file) return;
    uploadMutation.mutate(
      { entryId: entry.id, field: pendingFieldRef.current, file },
      {
        onSuccess: () => toast.success("Arquivo anexado."),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function openDocument(path: string) {
    const documentWindow = window.open("", "_blank");
    openMutation.mutate(path, {
      onSuccess: (url) => {
        if (documentWindow) documentWindow.location.href = url;
        else window.location.assign(url);
      },
      onError: (error) => {
        documentWindow?.close();
        toast.error(error.message);
      },
    });
  }

  function payEntry() {
    onPay(entry);
  }

  async function copyDigitableLine() {
    if (!entry.digitableLine) return;
    try {
      await navigator.clipboard.writeText(entry.digitableLine);
      toast.success("Código copiado. Cole no app do banco.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-start gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-x-4">
      <div className="col-start-1 row-start-1 flex w-12 flex-col leading-tight">
        <span className="font-semibold tabular-nums">
          {day}/{month}
        </span>
        <span className="text-muted-foreground text-xs">
          {getWeekdayShortLabel(getIsoWeekday(entry.dueDate))}
        </span>
      </div>

      <div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-1">
        <span className="truncate font-medium">{entry.description}</span>
        <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-xs">
          {isAutomatic && (
            <Badge variant="secondary">
              <PackageOpen aria-hidden />
              {ENTRY_SOURCE_LABELS[entry.source]}
            </Badge>
          )}
          {entry.installmentNumber && entry.installmentCount && (
            <Badge variant="outline">
              Parcela {entry.installmentNumber}/{entry.installmentCount}
            </Badge>
          )}
          {entry.recurrenceFrequency && (
            <Badge variant="outline">
              <Repeat aria-hidden />
              {RECURRENCE_FREQUENCY_LABELS[entry.recurrenceFrequency]}
            </Badge>
          )}
          {[entry.categoryName, entry.supplierName]
            .filter((detail) => detail !== null)
            .join(" · ")}
          {entry.documentPath && (
            <FileText aria-label="Boleto anexado" className="size-3.5" />
          )}
          {entry.receiptPath && (
            <Receipt aria-label="Comprovante anexado" className="size-3.5" />
          )}
        </div>
        {entry.paidAt && (
          <span className="text-muted-foreground text-xs">
            {isExpense ? "Paga" : "Recebida"} em {formatDateKey(entry.paidAt)}
            {entry.paidByName ? ` · ${entry.paidByName}` : ""}
          </span>
        )}
      </div>

      <div className="col-start-3 row-start-1 flex flex-col items-end gap-1">
        <span
          className={cn(
            "whitespace-nowrap font-semibold tabular-nums",
            status === "overdue" && "text-destructive",
            status === "paid" && "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {formatCurrency(entry.paidAmount ?? entry.amount)}
        </span>
        <Badge variant={STATUS_BADGE_VARIANTS[status]}>
          {getEntryStatusLabel(status, entry.kind)}
        </Badge>
      </div>

      {!entry.paidAt && (
        <Button
          variant="outline"
          className="col-span-3 col-start-2 row-start-2 h-9 justify-self-end sm:col-span-1 sm:col-start-4 sm:row-start-1"
          onClick={payEntry}
        >
          {isExpense ? "Pagar" : "Receber"}
        </Button>
      )}

      <div className="col-start-4 row-start-1 sm:col-start-5">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Opções de ${entry.description}`}
                disabled={uploadMutation.isPending}
              />
            }
          >
            <MoreHorizontal aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            {isEditable && (
              <DropdownMenuItem onClick={() => onEdit(entry)}>
                <Pencil aria-hidden />
                Editar
              </DropdownMenuItem>
            )}
            {entry.digitableLine && (
              <DropdownMenuItem onClick={copyDigitableLine}>
                <Copy aria-hidden />
                Copiar código do boleto
              </DropdownMenuItem>
            )}
            {entry.paidAt && (
              <DropdownMenuItem
                onClick={() =>
                  undoPaymentMutation.mutate(entry.id, {
                    onSuccess: () => toast.success("Pagamento desfeito."),
                    onError: (error) => toast.error(error.message),
                  })
                }
              >
                <Undo2 aria-hidden />
                Desfazer {isExpense ? "pagamento" : "recebimento"}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {entry.documentPath ? (
              <>
                <DropdownMenuItem
                  onClick={() =>
                    entry.documentPath && openDocument(entry.documentPath)
                  }
                >
                  <FileText aria-hidden />
                  Ver {isExpense ? "boleto" : "documento"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    removeDocumentMutation.mutate(
                      { entryId: entry.id, field: "document" },
                      { onError: (error) => toast.error(error.message) },
                    )
                  }
                >
                  <Trash2 aria-hidden />
                  Remover {isExpense ? "boleto" : "documento"}
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={() => pickFile("document")}>
                <Paperclip aria-hidden />
                Anexar {isExpense ? "boleto ou nota" : "documento"}
              </DropdownMenuItem>
            )}
            {entry.receiptPath ? (
              <>
                <DropdownMenuItem
                  onClick={() =>
                    entry.receiptPath && openDocument(entry.receiptPath)
                  }
                >
                  <Receipt aria-hidden />
                  Ver comprovante
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    removeDocumentMutation.mutate(
                      { entryId: entry.id, field: "receipt" },
                      { onError: (error) => toast.error(error.message) },
                    )
                  }
                >
                  <Trash2 aria-hidden />
                  Remover comprovante
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={() => pickFile("receipt")}>
                <Receipt aria-hidden />
                Anexar comprovante
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(entry)}
            >
              <Trash2 aria-hidden />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_DOCUMENT_TYPES}
          className="hidden"
          onChange={(event) => {
            uploadFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
    </li>
  );
}
