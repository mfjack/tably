export const ORGANIZATION_DOCUMENTS_BUCKET = "organization-documents";

export const DOCUMENT_EXPIRY_WARNING_DAYS = 30;

export const MAX_DOCUMENT_SIZE_IN_MEGABYTES = 10;

export function removeFileExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}
