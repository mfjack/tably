const BYTES_PER_MEGABYTE = 1024 * 1024;

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
