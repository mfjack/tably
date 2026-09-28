import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { createClient } from "@/lib/supabase/client";
import {
  getProductImageValidationError,
  PRODUCT_IMAGES_BUCKET,
} from "../product-image";

const FILE_EXTENSIONS_BY_TYPE: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function getUploadProductImageMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "product-images", "upload"] as const;
}

export function useUploadProductImageMutation(organizationId: OrganizationId) {
  return useMutation({
    mutationKey: getUploadProductImageMutationKey(organizationId),
    mutationFn: async (file: File): Promise<string> => {
      const validationError = getProductImageValidationError(file);
      if (validationError) throw new Error(validationError);

      const filePath = `${organizationId}/${crypto.randomUUID()}.${FILE_EXTENSIONS_BY_TYPE[file.type]}`;
      const storage = createClient().storage.from(PRODUCT_IMAGES_BUCKET);
      const { error } = await storage.upload(filePath, file, {
        contentType: file.type,
        cacheControl: "31536000",
      });

      if (error) throw new Error("Não foi possível enviar a imagem.");

      return storage.getPublicUrl(filePath).data.publicUrl;
    },
  });
}
