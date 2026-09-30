import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { CenteredLayout } from "@/components/layout/centered-layout";
import { RetryButton } from "./components/retry-button";

export const metadata: Metadata = { title: "Sem internet" };

export default function OfflinePage() {
  return (
    <CenteredLayout>
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <WifiOff className="size-6 text-muted-foreground" aria-hidden />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-semibold text-xl">Sem internet</h1>
          <p className="text-muted-foreground text-sm">
            Esta tela ainda não foi salva neste aparelho. O PDV funciona sem
            internet depois de aberto uma vez com conexão.
          </p>
        </div>
        <RetryButton />
      </div>
    </CenteredLayout>
  );
}
