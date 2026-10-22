"use client";

import { FileUp } from "lucide-react";
import { type ChangeEvent, useId, useRef } from "react";
import {
  ACCEPTED_DOCUMENT_TYPES,
  formatFileSize,
  getDocumentFileError,
} from "@/lib/document-files";
import { cn } from "@/lib/utils";

type FilePickerFieldProps = {
  label: string;
  file: File | null;
  error: string | null;
  maxSizeInMegabytes: number;
  isLabelVisible?: boolean;
  onFileChange: (file: File | null, error: string | null) => void;
};

export function FilePickerField({
  label,
  file,
  error,
  maxSizeInMegabytes,
  isLabelVisible = false,
  onFileChange,
}: FilePickerFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile) return;

    const fileError = getDocumentFileError(selectedFile, maxSizeInMegabytes);
    onFileChange(fileError ? null : selectedFile, fileError);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className={cn("font-medium text-sm", !isLabelVisible && "sr-only")}
      >
        {label}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={ACCEPTED_DOCUMENT_TYPES}
        className="sr-only"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex items-center gap-3 rounded-xl border border-dashed p-4 text-left transition-colors hover:bg-muted/50",
          error && "border-destructive",
        )}
      >
        <FileUp className="size-6 shrink-0 text-muted-foreground" aria-hidden />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-sm">
            {file ? file.name : "Escolher arquivo"}
          </span>
          <span className="text-muted-foreground text-xs">
            {file
              ? `${formatFileSize(file.size)} · toque para trocar`
              : `PDF, JPG, PNG ou WEBP de até ${maxSizeInMegabytes} MB. No celular, dá para tirar a foto na hora.`}
          </span>
        </span>
      </button>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
