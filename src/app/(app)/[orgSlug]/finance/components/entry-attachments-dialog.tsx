"use client";

import { FileText, Paperclip, Trash2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Button } from "@/components/ui/button";
import { useAddFinancialEntryAttachmentsMutation } from "@/features/finance/hooks/use-add-financial-entry-attachments-mutation";
import { useOpenFinancialAttachment } from "@/features/finance/hooks/use-open-financial-attachment";
import { useRemoveFinancialEntryAttachmentMutation } from "@/features/finance/hooks/use-remove-financial-entry-attachment-mutation";
import type {
  FinancialEntry,
  FinancialEntryAttachment,
} from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";
import { ACCEPTED_DOCUMENT_TYPES } from "@/lib/document-files";

type EntryAttachmentsDialogProps = {
  organizationId: OrganizationId;
  entry: FinancialEntry;
  isOpen: boolean;
  onClose: () => void;
};

export function EntryAttachmentsDialog({
  organizationId,
  entry,
  isOpen,
  onClose,
}: EntryAttachmentsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMutation = useAddFinancialEntryAttachmentsMutation(organizationId);
  const removeMutation =
    useRemoveFinancialEntryAttachmentMutation(organizationId);
  const openAttachment = useOpenFinancialAttachment(organizationId);
  const removingId = removeMutation.isPending ? removeMutation.variables : null;

  function addFiles(files: File[]) {
    if (files.length === 0) return;
    addMutation.mutate(
      { entryId: entry.id, files },
      {
        onSuccess: () =>
          toast.success(
            files.length > 1 ? "Arquivos anexados." : "Arquivo anexado.",
          ),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function removeAttachment(attachment: FinancialEntryAttachment) {
    removeMutation.mutate(attachment.id, {
      onSuccess: () => toast.success("Anexo removido."),
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <DetailsDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={`Anexos · ${entry.description}`}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            onClick={onClose}
          >
            Fechar
          </Button>
          <Button
            type="button"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            disabled={addMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip aria-hidden />
            {addMutation.isPending ? "Enviando..." : "Adicionar arquivos"}
          </Button>
        </>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_DOCUMENT_TYPES}
        multiple
        className="hidden"
        aria-label="Arquivos para anexar"
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      {entry.attachments.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhum arquivo ainda. Anexe o boleto, a nota fiscal ou o comprovante
          de pagamento.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {entry.attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-2 px-3 py-2"
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm hover:underline"
                onClick={() => openAttachment(attachment.path)}
              >
                <FileText
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="truncate">{attachment.fileName}</span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive"
                aria-label={`Remover ${attachment.fileName}`}
                disabled={removingId === attachment.id}
                onClick={() => removeAttachment(attachment)}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </DetailsDialog>
  );
}
