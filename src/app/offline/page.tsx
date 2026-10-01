import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { StatusMessage } from "@/components/feedback/status-message";
import { CenteredLayout } from "@/components/layout/centered-layout";
import { RetryButton } from "./components/retry-button";

export const metadata: Metadata = { title: "Sem internet" };

export default function OfflinePage() {
  return (
    <CenteredLayout>
      <StatusMessage
        icon={WifiOff}
        title="Sem internet"
        description="Esta tela ainda não foi salva neste aparelho. O PDV funciona sem internet depois de aberto uma vez com conexão."
        action={<RetryButton />}
      />
    </CenteredLayout>
  );
}
