"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileUp } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { DateField } from "@/components/form/date-field";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import { FieldGroup } from "@/components/ui/field";
import {
  ACCEPTED_DOCUMENT_TYPES,
  formatFileSize,
  getDocumentFileError,
  removeFileExtension,
} from "@/features/documents/document-files";
import { DOCUMENT_KIND_OPTIONS } from "@/features/documents/document-kinds";
import { useCreateDocumentMutation } from "@/features/documents/hooks/use-create-document-mutation";
import { useUpdateDocumentMutation } from "@/features/documents/hooks/use-update-document-mutation";
import {
  type DocumentFormInput,
  documentFormSchema,
} from "@/features/documents/schemas";
import type { OrganizationDocument } from "@/features/documents/types";
import type { OrganizationId } from "@/features/organizations/types";
import { cn } from "@/lib/utils";

const EMPTY_DOCUMENT_FORM: DefaultValues<DocumentFormInput> = {
  name: "",
  expiresOn: "",
  notes: "",
};

type DocumentFormDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  document?: OrganizationDocument;
  onClose: () => void;
};

function toFormValues(
  document: OrganizationDocument,
): DefaultValues<DocumentFormInput> {
  return {
    name: document.name,
    kind: document.kind,
    expiresOn: document.expiresOn ?? "",
    notes: document.notes ?? "",
  };
}

export function DocumentFormDialog({
  organizationId,
  isOpen,
  document,
  onClose,
}: DocumentFormDialogProps) {
  const createMutation = useCreateDocumentMutation(organizationId);
  const updateMutation = useUpdateDocumentMutation(organizationId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const form = useForm<DocumentFormInput>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: EMPTY_DOCUMENT_FORM,
  });
  const isEditing = document !== undefined;

  useEffect(() => {
    if (!isOpen) return;
    form.reset(document ? toFormValues(document) : EMPTY_DOCUMENT_FORM);
    setFile(null);
    setFileError(null);
    createMutation.reset();
    updateMutation.reset();
  }, [isOpen, document, form, createMutation.reset, updateMutation.reset]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile) return;

    const error = getDocumentFileError(selectedFile);
    setFileError(error);
    setFile(error ? null : selectedFile);
    if (!error && !form.getValues("name")) {
      form.setValue("name", removeFileExtension(selectedFile.name), {
        shouldValidate: true,
      });
    }
  }

  const handleSubmit = form.handleSubmit((values) => {
    const callbacks = {
      onSuccess: () => {
        toast.success(
          isEditing ? "Documento atualizado." : "Documento guardado.",
        );
        onClose();
      },
      onError: (error: Error) => toast.error(error.message),
    };

    if (document) {
      updateMutation.mutate(
        { documentId: document.id, input: values },
        callbacks,
      );
      return;
    }
    if (!file) {
      setFileError("Escolha o arquivo do documento.");
      return;
    }
    createMutation.mutate({ input: values, file }, callbacks);
  });

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={isEditing ? "Editar documento" : "Novo documento"}
      description="PDF ou foto de até 10 MB. Com validade, o Início avisa 30 dias antes de vencer."
      submitLabel={isEditing ? "Salvar" : "Guardar"}
      isSubmitting={createMutation.isPending || updateMutation.isPending}
      onSubmit={handleSubmit}
      size="large"
    >
      <FieldGroup>
        {!isEditing && (
          <div className="flex flex-col gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_DOCUMENT_TYPES}
              className="sr-only"
              onChange={handleFileChange}
              aria-label="Arquivo do documento"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-dashed p-4 text-left transition-colors hover:bg-muted/50",
                fileError && "border-destructive",
              )}
            >
              <FileUp
                className="size-6 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-sm">
                  {file ? file.name : "Escolher arquivo"}
                </span>
                <span className="text-muted-foreground text-xs">
                  {file
                    ? `${formatFileSize(file.size)} · toque para trocar`
                    : "PDF, JPG, PNG ou WEBP. No celular, dá para tirar a foto na hora."}
                </span>
              </span>
            </button>
            {fileError && (
              <p className="text-destructive text-sm" role="alert">
                {fileError}
              </p>
            )}
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="name"
            label="Nome"
            placeholder="Ex.: Alvará 2026"
            autoComplete="off"
          />
          <SelectField
            control={form.control}
            name="kind"
            label="Tipo"
            options={DOCUMENT_KIND_OPTIONS}
          />
        </div>
        <DateField
          control={form.control}
          name="expiresOn"
          label="Validade (opcional)"
          placeholder="Escolha a data"
          description="Deixe em branco se o documento não vence."
        />
        <TextareaField
          control={form.control}
          name="notes"
          label="Observações"
          placeholder="Ex.: Renovar na prefeitura com 15 dias de antecedência"
        />
      </FieldGroup>
    </FormDialog>
  );
}
