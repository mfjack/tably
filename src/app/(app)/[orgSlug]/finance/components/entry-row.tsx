"use client";

import {
  Copy,
  MessageSquareText,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Repeat,
  Trash2,
  Undo2,
} from "lucide-react";
import { useState } from "react";
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
import { useOpenFinancialAttachment } from "@/features/finance/hooks/use-open-financial-attachment";
import { useUndoFinancialEntryPaymentMutation } from "@/features/finance/hooks/use-undo-financial-entry-payment-mutation";
import {
  getEntryStatus,
  getEntryStatusLabel,
  isEditableEntrySource,
  RECURRENCE_FREQUENCY_LABELS,
} from "@/features/finance/labels";
import type { EntryStatus, FinancialEntry } from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";
import { getIsoWeekday } from "@/features/time-clock/time-utils";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { formatCurrency, formatDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getWeekdayShortLabel } from "@/lib/weekdays";
import { EntryAttachmentsDialog } from "./entry-attachments-dialog";

const STATUS_BADGE_VARIANTS = {
  overdue: "destructive",
  due_today: "outline",
  open: "outline",
  paid: "success",
} as const satisfies Record<EntryStatus, "destructive" | "outline" | "success">;

const DATE_TILE_CLASS_NAMES = {
  overdue: "bg-destructive/10 text-destructive",
  due_today: "bg-warning/15 text-warning",
  open: "bg-muted text-foreground",
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
} as const satisfies Record<EntryStatus, string>;

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
  const isEditable = isEditableEntrySource(entry.source);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const attachmentCount = entry.attachments.length;
  const firstAttachment = entry.attachments[0];
  const openAttachment = useOpenFinancialAttachment(organizationId);
  const undoPaymentMutation =
    useUndoFinancialEntryPaymentMutation(organizationId);
  const [, month, day] = entry.dueDate.split("-");
  const isOtherMonth = entry.dueDate.slice(0, 7) !== today.slice(0, 7);

  function payEntry() {
    onPay(entry);
  }

  function copyDigitableLine() {
    if (!entry.digitableLine) return;
    return copyToClipboard(
      entry.digitableLine,
      "Código copiado. Cole no app do banco.",
    );
  }

  return (
    <li
      className={cn(
        "relative grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-start gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-x-4",
        isEditable && "transition-colors hover:bg-muted/40",
      )}
    >
      {isEditable && (
        <button
          type="button"
          aria-label={`Editar ${entry.description}`}
          className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset"
          onClick={() => onEdit(entry)}
        />
      )}
      <div
        className={cn(
          "col-start-1 row-start-1 flex h-12 min-w-12 flex-col items-center justify-center gap-0.5 self-center rounded-lg px-1.5 text-center",
          DATE_TILE_CLASS_NAMES[status],
        )}
      >
        <span
          className={cn(
            "font-semibold tabular-nums",
            isOtherMonth ? "text-sm/none" : "text-lg/none",
          )}
        >
          {isOtherMonth ? `${day}/${month}` : day}
        </span>
        <span className="text-xs/none opacity-80">
          {getWeekdayShortLabel(getIsoWeekday(entry.dueDate))}
        </span>
      </div>

      <div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-1">
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
        </div>
        {entry.notes && (
          <p className="relative flex items-start gap-1 text-muted-foreground text-xs">
            <MessageSquareText
              aria-hidden
              className="mt-px size-3.5 shrink-0"
            />
            <span className="line-clamp-2 select-text whitespace-pre-line">
              {entry.notes}
            </span>
          </p>
        )}
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
        {status !== "open" && (
          <Badge variant={STATUS_BADGE_VARIANTS[status]}>
            {getEntryStatusLabel(status, entry.kind)}
          </Badge>
        )}
      </div>

      {(!entry.paidAt || firstAttachment) && (
        <div className="relative col-span-3 col-start-2 row-start-2 flex justify-end gap-2 sm:col-span-1 sm:col-start-4 sm:row-start-1">
          {firstAttachment && (
            <Button
              variant="secondary"
              className="h-9"
              onClick={() =>
                attachmentCount === 1
                  ? openAttachment(firstAttachment.path)
                  : setIsAttachmentsOpen(true)
              }
            >
              <Paperclip aria-hidden />
              {attachmentCount === 1
                ? `Ver ${isExpense ? "boleto" : "documento"}`
                : `${attachmentCount} anexos`}
            </Button>
          )}
          {!entry.paidAt && (
            <Button variant="outline" className="h-9" onClick={payEntry}>
              {isExpense ? "Pagar" : "Receber"}
            </Button>
          )}
        </div>
      )}

      <div className="relative col-start-4 row-start-1 sm:col-start-5">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Opções de ${entry.description}`}
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
            <DropdownMenuItem onClick={() => setIsAttachmentsOpen(true)}>
              <Paperclip aria-hidden />
              Anexos{attachmentCount > 0 ? ` (${attachmentCount})` : ""}
            </DropdownMenuItem>
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
        <EntryAttachmentsDialog
          organizationId={organizationId}
          entry={entry}
          isOpen={isAttachmentsOpen}
          onClose={() => setIsAttachmentsOpen(false)}
        />
      </div>
    </li>
  );
}
