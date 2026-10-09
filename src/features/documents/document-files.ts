export const ORGANIZATION_DOCUMENTS_BUCKET = "organization-documents";

export const DOCUMENT_EXPIRY_WARNING_DAYS = 30;

export const MAX_DOCUMENT_SIZE_IN_MEGABYTES = 10;

const BYTES_PER_KILOBYTE = 1024;

export function removeFileExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

export function formatFileSize(sizeBytes: number): string {
  const kilobytes = sizeBytes / BYTES_PER_KILOBYTE;
  if (kilobytes < BYTES_PER_KILOBYTE)
    return `${Math.max(1, Math.round(kilobytes))} KB`;
  return `${(kilobytes / BYTES_PER_KILOBYTE).toFixed(1).replace(".", ",")} MB`;
}
