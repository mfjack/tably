import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type StockLinkButtonProps = {
  itemName: string;
  href: string;
};

export function StockLinkButton({ itemName, href }: StockLinkButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      nativeButton={false}
      aria-label={`Ver estoque de ${itemName}`}
      render={<Link href={href} />}
    >
      Ver estoque
      <ArrowRight aria-hidden />
    </Button>
  );
}
