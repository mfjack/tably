const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE;

export const DOCUMENT_EXTENSIONS_BY_TYPE: Readonly<Record<string, string>> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ACCEPTED_DOCUMENT_TYPES = Object.keys(
  DOCUMENT_EXTENSIONS_BY_TYPE,
).join(",");

export function getDocumentFileError(
  file: File,
  maxSizeInMegabytes: number,
): string | null {
  if (!DOCUMENT_EXTENSIONS_BY_TYPE[file.type]) {
    return "Envie um PDF ou uma foto (JPG, PNG ou WEBP).";
  }
  if (file.size > maxSizeInMegabytes * BYTES_PER_MEGABYTE) {
    return `O arquivo pode ter no máximo ${maxSizeInMegabytes} MB.`;
  }
  return null;
}

export function buildDocumentPath(folder: string, file: File): string {
  return `${folder}/${crypto.randomUUID()}.${DOCUMENT_EXTENSIONS_BY_TYPE[file.type]}`;
}

export function formatFileSize(sizeBytes: number): string {
  const kilobytes = sizeBytes / BYTES_PER_KILOBYTE;
  if (kilobytes < BYTES_PER_KILOBYTE)
    return `${Math.max(1, Math.round(kilobytes))} KB`;
  return `${(kilobytes / BYTES_PER_KILOBYTE).toFixed(1).replace(".", ",")} MB`;
}
