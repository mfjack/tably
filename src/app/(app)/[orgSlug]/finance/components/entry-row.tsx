"use client";

import {
  Copy,
  FileText,
  MoreHorizontal,
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
  getEntryStatus,
  getEntryStatusLabel,
  RECURRENCE_FREQUENCY_LABELS,
} from "@/features/finance/labels";
import type { FinancialEntry } from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";
import { getIsoWeekday } from "@/features/time-clock/time-utils";
import { formatCurrency, formatDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";

type DocumentField = "document" | "receipt";

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
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="flex w-12 shrink-0 flex-col leading-tight">
        <span className="font-semibold tabular-nums">
          {day}/{month}
        </span>
        <span className="text-muted-foreground text-xs">
          {getWeekdayShortLabel(getIsoWeekday(entry.dueDate))}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
        <span className="truncate font-medium">{entry.description}</span>
        <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-xs">
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
            {entry.accountName ? ` · ${entry.accountName}` : ""}
            {entry.paidByName ? ` · ${entry.paidByName}` : ""}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span
            className={cn(
              "font-semibold tabular-nums",
              status === "overdue" && "text-destructive",
            )}
          >
            {formatCurrency(entry.paidAmount ?? entry.amount)}
          </span>
          <Badge
            variant={
              status === "overdue"
                ? "destructive"
                : status === "paid"
                  ? "secondary"
                  : "outline"
            }
          >
            {getEntryStatusLabel(status, entry.kind)}
          </Badge>
        </div>

        {!entry.paidAt && (
          <Button
            variant="outline"
            className="h-9"
            onClick={() => onPay(entry)}
          >
            {isExpense ? "Pagar" : "Receber"}
          </Button>
        )}

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
            <DropdownMenuItem onClick={() => onEdit(entry)}>
              <Pencil aria-hidden />
              Editar
            </DropdownMenuItem>
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
