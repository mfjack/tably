import Link from "next/link";
import type { ComponentProps } from "react";

type AuthFooterLinkProps = {
  question: string;
  href: ComponentProps<typeof Link>["href"];
  linkLabel: string;
};

export function AuthFooterLink({
  question,
  href,
  linkLabel,
}: AuthFooterLinkProps) {
  return (
    <p className="text-center text-muted-foreground text-sm">
      {question}{" "}
      <Link href={href} className="font-medium text-primary hover:underline">
        {linkLabel}
      </Link>
    </p>
  );
}
