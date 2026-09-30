export const FINANCIAL_DOCUMENTS_BUCKET = "financial-documents";

const MAX_DOCUMENT_SIZE_IN_BYTES = 5 * 1024 * 1024;

export const DOCUMENT_EXTENSIONS_BY_TYPE: Readonly<Record<string, string>> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ACCEPTED_DOCUMENT_TYPES = Object.keys(
  DOCUMENT_EXTENSIONS_BY_TYPE,
).join(",");

export function getDocumentValidationError(file: File): string | null {
  if (!DOCUMENT_EXTENSIONS_BY_TYPE[file.type]) {
    return "Envie um PDF ou uma foto (JPG, PNG ou WEBP).";
  }
  if (file.size > MAX_DOCUMENT_SIZE_IN_BYTES) {
    return "O arquivo pode ter no máximo 5 MB.";
  }
  return null;
}
