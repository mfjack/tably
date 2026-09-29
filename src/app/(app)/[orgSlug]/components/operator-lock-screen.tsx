"use client";

import { ArrowLeft, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSignOutMutation } from "@/features/auth/hooks/use-sign-out-mutation";
import { useUnlockOperatorMutation } from "@/features/operators/hooks/use-unlock-operator-mutation";
import type { OperatorSummary } from "@/features/operators/types";
import type { OrganizationId } from "@/features/organizations/types";
import { getInitials } from "@/lib/get-initials";
import { MAX_PIN_LENGTH, PinPad } from "./pin-pad";

type OperatorLockScreenProps = {
  organizationId: OrganizationId;
  organizationName: string;
  operators: OperatorSummary[];
};

export function OperatorLockScreen({
  organizationId,
  organizationName,
  operators,
}: OperatorLockScreenProps) {
  const router = useRouter();
  const unlockMutation = useUnlockOperatorMutation(organizationId);
  const signOutMutation = useSignOutMutation();
  const [selectedOperator, setSelectedOperator] =
    useState<OperatorSummary | null>(null);
  const [pin, setPin] = useState("");
  const [hasError, setHasError] = useState(false);

  function selectOperator(operator: OperatorSummary | null) {
    setSelectedOperator(operator);
    setPin("");
    setHasError(false);
  }

  function appendDigit(digit: string) {
    setPin((currentPin) =>
      currentPin.length < MAX_PIN_LENGTH ? currentPin + digit : currentPin,
    );
    setHasError(false);
  }

  function deleteDigit() {
    setPin((currentPin) => currentPin.slice(0, -1));
    setHasError(false);
  }

  function submitPin() {
    if (!selectedOperator) return;

    unlockMutation.mutate(
      { operatorId: selectedOperator.id, pin },
      {
        onSuccess: () => router.refresh(),
        onError: (error) => {
          setPin("");
          setHasError(true);
          toast.error(error.message);
        },
      },
    );
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-10 bg-muted/40 px-4 py-10">
      <header className="flex flex-col items-center gap-1.5 text-center">
        <h1 className="font-semibold text-[22px]">{organizationName}</h1>
        <p className="text-muted-foreground text-sm">
          {selectedOperator
            ? `Digite o PIN de ${selectedOperator.name}`
            : "Quem está usando?"}
        </p>
      </header>

      {selectedOperator ? (
        <div className="flex w-full flex-col items-center gap-6">
          <PinPad
            pin={pin}
            isSubmitting={unlockMutation.isPending}
            hasError={hasError}
            onAppendDigit={appendDigit}
            onDeleteDigit={deleteDigit}
            onSubmit={submitPin}
          />
          <Button
            type="button"
            variant="ghost"
            disabled={unlockMutation.isPending}
            onClick={() => selectOperator(null)}
          >
            <ArrowLeft aria-hidden />
            Trocar operador
          </Button>
        </div>
      ) : (
        <ul className="flex max-w-3xl flex-wrap justify-center gap-4">
          {operators.map((operator) => (
            <li key={operator.id}>
              <button
                type="button"
                className="flex w-36 flex-col items-center gap-3 rounded-2xl border bg-card px-4 py-5 shadow-xs transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                onClick={() => selectOperator(operator)}
              >
                <span
                  aria-hidden
                  className="flex size-14 items-center justify-center rounded-full bg-primary font-semibold text-lg text-primary-foreground"
                >
                  {getInitials(operator.name)}
                </span>
                <span className="w-full truncate text-center font-semibold text-[15px]">
                  {operator.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="ghost"
        className="text-muted-foreground"
        disabled={signOutMutation.isPending}
        onClick={() =>
          signOutMutation.mutate(undefined, {
            onError: (error) => toast.error(error.message),
          })
        }
      >
        <LogOut aria-hidden />
        Sair da conta
      </Button>
    </main>
  );
}
