export const PRODUCT_IMAGES_BUCKET = "product-images";

export const PRODUCT_IMAGE_MAX_SIZE_IN_BYTES = 2 * 1024 * 1024;

export const PRODUCT_IMAGE_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type AcceptedImageType = (typeof PRODUCT_IMAGE_ACCEPTED_TYPES)[number];

export function isAcceptedImageType(type: string): type is AcceptedImageType {
  return PRODUCT_IMAGE_ACCEPTED_TYPES.includes(type as AcceptedImageType);
}

export function getProductImageValidationError(file: File): string | null {
  if (!isAcceptedImageType(file.type)) {
    return "Use uma imagem JPG, PNG ou WebP.";
  }
  if (file.size > PRODUCT_IMAGE_MAX_SIZE_IN_BYTES) {
    return "A imagem precisa ter no máximo 2 MB.";
  }
  return null;
}
