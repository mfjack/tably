export const ORGANIZATION_DOCUMENTS_BUCKET = "organization-documents";

export const DOCUMENT_EXPIRY_WARNING_DAYS = 30;

const MAX_DOCUMENT_SIZE_IN_BYTES = 10 * 1024 * 1024;

const BYTES_PER_KILOBYTE = 1024;

export const DOCUMENT_EXTENSIONS_BY_TYPE: Readonly<Record<string, string>> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ACCEPTED_DOCUMENT_TYPES = Object.keys(
  DOCUMENT_EXTENSIONS_BY_TYPE,
).join(",");

export function getDocumentFileError(file: File): string | null {
  if (!DOCUMENT_EXTENSIONS_BY_TYPE[file.type]) {
    return "Envie um PDF ou uma foto (JPG, PNG ou WEBP).";
  }
  if (file.size > MAX_DOCUMENT_SIZE_IN_BYTES) {
    return "O arquivo pode ter no máximo 10 MB.";
  }
  return null;
}

export function removeFileExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

export function formatFileSize(sizeBytes: number): string {
  const kilobytes = sizeBytes / BYTES_PER_KILOBYTE;
  if (kilobytes < BYTES_PER_KILOBYTE)
    return `${Math.max(1, Math.round(kilobytes))} KB`;
  return `${(kilobytes / BYTES_PER_KILOBYTE).toFixed(1).replace(".", ",")} MB`;
}
