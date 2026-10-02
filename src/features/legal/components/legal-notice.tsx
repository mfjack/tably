import Link from "next/link";
import { ROUTES } from "@/lib/routes";

type LegalNoticeProps = {
  actionLabel: string;
};

const LINK_CLASS_NAME = "underline underline-offset-4 hover:text-foreground";

export function LegalNotice({ actionLabel }: LegalNoticeProps) {
  return (
    <p className="max-w-80 text-center text-[0.8125rem] text-muted-foreground">
      {actionLabel}, você concorda com os{" "}
      <Link href={ROUTES.terms} target="_blank" className={LINK_CLASS_NAME}>
        Termos de uso
      </Link>{" "}
      e a{" "}
      <Link href={ROUTES.privacy} target="_blank" className={LINK_CLASS_NAME}>
        Política de privacidade
      </Link>
      .
    </p>
  );
}
