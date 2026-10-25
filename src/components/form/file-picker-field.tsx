"use client";

import { FileUp, X } from "lucide-react";
import { type ChangeEvent, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  ACCEPTED_DOCUMENT_TYPES,
  formatFileSize,
  getDocumentFileError,
} from "@/lib/document-files";
import { cn } from "@/lib/utils";

type FilePickerFieldProps = {
  label: string;
  files: readonly File[];
  error: string | null;
  maxSizeInMegabytes: number;
  isLabelVisible?: boolean;
  isMultiple?: boolean;
  isCompact?: boolean;
  onFilesChange: (files: File[], error: string | null) => void;
};

function getPickerTitle(files: readonly File[], isMultiple: boolean): string {
  if (files.length === 0) {
    return isMultiple ? "Escolher arquivos" : "Escolher arquivo";
  }
  if (isMultiple) return "Adicionar mais arquivos";
  return files[0]?.name ?? "";
}

export function FilePickerField({
  label,
  files,
  error,
  maxSizeInMegabytes,
  isLabelVisible = false,
  isMultiple = false,
  isCompact = false,
  onFilesChange,
}: FilePickerFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const singleFile = !isMultiple ? files[0] : undefined;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selectedFiles.length === 0) return;

    const fileError =
      selectedFiles
        .map((file) => getDocumentFileError(file, maxSizeInMegabytes))
        .find((message) => message !== null) ?? null;
    const validFiles = selectedFiles.filter(
      (file) => getDocumentFileError(file, maxSizeInMegabytes) === null,
    );
    onFilesChange(
      isMultiple ? [...files, ...validFiles] : validFiles.slice(0, 1),
      fileError,
    );
  }

  function removeFile(index: number) {
    onFilesChange(
      files.filter((_, fileIndex) => fileIndex !== index),
      null,
    );
  }

  return (
    <div className={cn("flex flex-col", isCompact ? "gap-2" : "gap-1.5")}>
      <label
        htmlFor={inputId}
        className={cn(
          "font-medium text-sm",
          isCompact && "flex h-5 items-center",
          !isLabelVisible && "sr-only",
        )}
      >
        {label}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={ACCEPTED_DOCUMENT_TYPES}
        multiple={isMultiple}
        className="sr-only"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title={`PDF, JPG, PNG ou WEBP de até ${maxSizeInMegabytes} MB`}
        className={cn(
          "flex items-center gap-3 border border-dashed text-left transition-colors hover:bg-muted/50",
          isCompact ? "h-12 rounded-lg px-4" : "rounded-xl p-4",
          error && "border-destructive",
        )}
      >
        <FileUp
          className={cn(
            "shrink-0 text-muted-foreground",
            isCompact ? "size-5" : "size-6",
          )}
          aria-hidden
        />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-sm">
            {getPickerTitle(files, isMultiple)}
          </span>
          {!isCompact && (
            <span className="text-muted-foreground text-xs">
              {singleFile
                ? `${formatFileSize(singleFile.size)} · toque para trocar`
                : `PDF, JPG, PNG ou WEBP de até ${maxSizeInMegabytes} MB. No celular, dá para tirar a foto na hora.`}
            </span>
          )}
        </span>
      </button>
      {isMultiple && files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}-${index.toString()}`}
              className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="shrink-0 text-muted-foreground text-xs">
                {formatFileSize(file.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remover ${file.name}`}
                onClick={() => removeFile(index)}
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
