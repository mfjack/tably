import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const THUMBNAIL_SIZES = {
  small: {
    pixels: 40,
    className: "size-10 rounded-lg",
    iconClassName: "size-4",
  },
} as const;

type ProductThumbnailProps = {
  imageUrl: string | null;
  productName: string;
  size?: keyof typeof THUMBNAIL_SIZES;
};

export function ProductThumbnail({
  imageUrl,
  productName,
  size = "small",
}: ProductThumbnailProps) {
  const thumbnailSize = THUMBNAIL_SIZES[size];

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={productName}
        width={thumbnailSize.pixels}
        height={thumbnailSize.pixels}
        className={cn("shrink-0 object-cover", thumbnailSize.className)}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center bg-muted text-muted-foreground",
        thumbnailSize.className,
      )}
    >
      <ShoppingBag className={thumbnailSize.iconClassName} />
    </div>
  );
}
