import { AtSign } from "lucide-react";
import Link from "next/link";

type InstagramLinkProps = {
  handle: string;
};

export function InstagramLink({ handle }: InstagramLinkProps) {
  const username = handle.replace(/^@/, "");

  return (
    <Link
      href={`https://instagram.com/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-8 items-center gap-1.5 rounded-full border px-3 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
    >
      <AtSign className="size-4" aria-hidden />
      {username}
    </Link>
  );
}
