"use client";

import Image from "next/image";
import { useState } from "react";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { ProductThumbnail } from "@/features/products/components/product-thumbnail";

const ENLARGED_IMAGE_SIZE = 640;

type MenuItemImageProps = {
  imageUrl: string;
  productName: string;
  description: string | null;
};

export function MenuItemImage({
  imageUrl,
  productName,
  description,
}: MenuItemImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={`Ampliar foto de ${productName}`}
        className="shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        onClick={() => setIsOpen(true)}
      >
        <ProductThumbnail
          imageUrl={imageUrl}
          productName={productName}
          size="large"
        />
      </button>
      <DetailsDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={productName}
        size="medium"
      >
        <div className="flex flex-col gap-3">
          <Image
            src={imageUrl}
            alt={productName}
            width={ENLARGED_IMAGE_SIZE}
            height={ENLARGED_IMAGE_SIZE}
            sizes="(max-width: 40rem) 100vw, 40rem"
            loading="eager"
            className="h-auto w-full rounded-xl"
          />
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      </DetailsDialog>
    </>
  );
}
