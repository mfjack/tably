"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { StatusMessage } from "@/components/feedback/status-message";
import { Button } from "@/components/ui/button";

type OrganizationErrorProps = {
  reset: () => void;
};

export default function OrganizationError({ reset }: OrganizationErrorProps) {
  const router = useRouter();

  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <StatusMessage
          icon={TriangleAlert}
          title="Algo deu errado"
          description="Não foi possível carregar esta tela. Confira a internet e tente de novo."
          action={
            <Button
              type="button"
              variant="outline"
              className="h-11 px-5"
              onClick={retry}
            >
              <RotateCw aria-hidden />
              Tentar de novo
            </Button>
          }
        />
      </div>
    </div>
  );
}
