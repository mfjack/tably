import { MessageCircle } from "lucide-react";
import { formatPhone } from "@/lib/masks";
import { cn } from "@/lib/utils";

const BRAZIL_COUNTRY_CODE = "55";

type WhatsAppLinkProps = {
  phone: string;
  className?: string;
};

export function getWhatsAppUrl(phone: string) {
  return `https://wa.me/${BRAZIL_COUNTRY_CODE}${phone}`;
}

export function WhatsAppLink({ phone, className }: WhatsAppLinkProps) {
  return (
    <a
      href={getWhatsAppUrl(phone)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Conversar no WhatsApp com ${formatPhone(phone)}`}
      className={cn(
        "inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline",
        className,
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <MessageCircle aria-hidden className="size-3.5 shrink-0" />
      {formatPhone(phone)}
    </a>
  );
}
