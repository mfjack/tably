import { House, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusMessage } from "@/components/feedback/status-message";
import { CenteredLayout } from "@/components/layout/centered-layout";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <CenteredLayout>
      <StatusMessage
        icon={SearchX}
        title="Página não encontrada"
        description="O endereço pode estar errado ou você não tem acesso a esta página."
        action={
          <Button
            className="h-11 px-5"
            nativeButton={false}
            render={<Link href={ROUTES.home} />}
          >
            <House aria-hidden />
            Voltar ao início
          </Button>
        }
      />
    </CenteredLayout>
  );
}
