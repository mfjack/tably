import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type ModuleLinkButtonProps = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function ModuleLinkButton({
  href,
  label,
  icon: Icon,
}: ModuleLinkButtonProps) {
  return (
    <Button
      variant="outline"
      className="h-11 px-4"
      nativeButton={false}
      render={<Link href={href} />}
    >
      <Icon aria-hidden />
      {label}
    </Button>
  );
}
