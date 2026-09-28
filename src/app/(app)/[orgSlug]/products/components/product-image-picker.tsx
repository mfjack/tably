"use client";

import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { type ChangeEvent, useRef } from "react";
import { type Control, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { OrganizationId } from "@/features/organizations/types";
import { useUploadProductImageMutation } from "@/features/products/hooks/use-upload-product-image-mutation";
import { PRODUCT_IMAGE_ACCEPTED_TYPES } from "@/features/products/product-image";
import type { ProductFormInput } from "@/features/products/schemas";

const PICKER_SIZE_IN_PIXELS = 112;

type ProductImagePickerProps = {
  organizationId: OrganizationId;
  control: Control<ProductFormInput>;
  productName: string;
};

export function ProductImagePicker({
  organizationId,
  control,
  productName,
}: ProductImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadImageMutation = useUploadProductImageMutation(organizationId);

  return (
    <Controller
      control={control}
      name="imageUrl"
      render={({ field }) => {
        const hasImage = Boolean(field.value);

        function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
          const selectedFile = event.target.files?.[0];
          event.target.value = "";
          if (!selectedFile) return;

          uploadImageMutation.mutate(selectedFile, {
            onSuccess: (imageUrl) => field.onChange(imageUrl),
            onError: (error) => toast.error(error.message),
          });
        }

        return (
          <div className="relative size-28 shrink-0">
            <button
              type="button"
              disabled={uploadImageMutation.isPending}
              aria-label={hasImage ? "Trocar foto" : "Adicionar foto"}
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex size-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl bg-muted text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {hasImage ? (
                <>
                  <Image
                    src={field.value ?? ""}
                    alt={productName || "Foto do produto"}
                    width={PICKER_SIZE_IN_PIXELS}
                    height={PICKER_SIZE_IN_PIXELS}
                    className="size-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-foreground/50 font-medium text-background text-xs opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    Trocar foto
                  </span>
                </>
              ) : (
                <>
                  <ImagePlus className="size-6" aria-hidden />
                  <span className="font-medium text-xs">Adicionar foto</span>
                </>
              )}
            </button>

            {uploadImageMutation.isPending && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/70">
                <Spinner aria-label="Enviando imagem" />
              </div>
            )}

            {hasImage && !uploadImageMutation.isPending && (
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label="Remover foto"
                className="absolute top-1.5 right-1.5 bg-background/90 shadow-xs"
                onClick={() => field.onChange("")}
              >
                <X aria-hidden />
              </Button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={PRODUCT_IMAGE_ACCEPTED_TYPES.join(",")}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={handleFileChange}
            />
          </div>
        );
      }}
    />
  );
}
