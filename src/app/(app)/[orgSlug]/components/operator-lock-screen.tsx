"use client";

import { ArrowLeft, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSignOutMutation } from "@/features/auth/hooks/use-sign-out-mutation";
import { useCreateOperatorPinMutation } from "@/features/operators/hooks/use-create-operator-pin-mutation";
import { useUnlockOperatorMutation } from "@/features/operators/hooks/use-unlock-operator-mutation";
import type { LockScreenOperator } from "@/features/operators/types";
import type { OrganizationId } from "@/features/organizations/types";
import { getInitials } from "@/lib/get-initials";
import { MAX_PIN_LENGTH, PinPad } from "./pin-pad";
import { PinSetup } from "./pin-setup";

type OperatorLockScreenProps = {
  organizationId: OrganizationId;
  organizationName: string;
  operators: LockScreenOperator[];
};

export function OperatorLockScreen({
  organizationId,
  organizationName,
  operators,
}: OperatorLockScreenProps) {
  const router = useRouter();
  const unlockMutation = useUnlockOperatorMutation(organizationId);
  const createPinMutation = useCreateOperatorPinMutation(organizationId);
  const signOutMutation = useSignOutMutation();
  const [selectedOperator, setSelectedOperator] =
    useState<LockScreenOperator | null>(null);
  const [pin, setPin] = useState("");
  const [hasError, setHasError] = useState(false);
  const pinRef = useRef("");
  const [pinSetupAttempt, setPinSetupAttempt] = useState(0);

  function updatePin(nextPin: string) {
    pinRef.current = nextPin;
    setPin(nextPin);
  }

  function selectOperator(operator: LockScreenOperator | null) {
    setSelectedOperator(operator);
    updatePin("");
    setHasError(false);
  }

  function submitPin(pinToSubmit: string) {
    if (!selectedOperator || unlockMutation.isPending) return;

    unlockMutation.mutate(
      { operatorId: selectedOperator.id, pin: pinToSubmit },
      {
        onSuccess: () => router.refresh(),
        onError: (error) => {
          updatePin("");
          setHasError(true);
          toast.error(error.message);
        },
      },
    );
  }

  function appendDigit(digit: string) {
    if (unlockMutation.isPending) return;
    const currentPin = pinRef.current;
    if (currentPin.length >= MAX_PIN_LENGTH) return;
    const nextPin = currentPin + digit;
    setHasError(false);
    updatePin(nextPin);
    if (nextPin.length === MAX_PIN_LENGTH) submitPin(nextPin);
  }

  function deleteDigit() {
    updatePin(pinRef.current.slice(0, -1));
    setHasError(false);
  }

  function createPin(newPin: string) {
    if (!selectedOperator) return;
    createPinMutation.mutate(
      { operatorId: selectedOperator.id, pin: newPin },
      {
        onSuccess: () => {
          toast.success("PIN criado. Bem-vindo!");
          router.refresh();
        },
        onError: (error) => {
          toast.error(error.message);
          setPinSetupAttempt((attempt) => attempt + 1);
        },
      },
    );
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-10 bg-muted/40 px-4 py-10">
      <header className="flex flex-col items-center gap-1.5 text-center">
        <h1 className="font-semibold text-[1.375rem]">{organizationName}</h1>
        <p className="text-muted-foreground text-sm">
          {selectedOperator
            ? selectedOperator.hasPin
              ? `Digite o PIN de ${selectedOperator.name}`
              : "Primeiro acesso"
            : "Quem está usando?"}
        </p>
      </header>

      {selectedOperator ? (
        <div className="flex w-full flex-col items-center gap-6">
          {selectedOperator.hasPin ? (
            <PinPad
              pin={pin}
              isSubmitting={unlockMutation.isPending}
              hasError={hasError}
              onAppendDigit={appendDigit}
              onDeleteDigit={deleteDigit}
              onSubmit={() => submitPin(pinRef.current)}
            />
          ) : (
            <PinSetup
              key={`${selectedOperator.id}-${pinSetupAttempt}`}
              personName={selectedOperator.name}
              isSubmitting={createPinMutation.isPending}
              onSubmit={createPin}
            />
          )}
          <Button
            type="button"
            variant="ghost"
            disabled={unlockMutation.isPending || createPinMutation.isPending}
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
                <span className="flex w-full flex-col items-center">
                  <span className="w-full truncate text-center font-semibold text-[0.9375rem]">
                    {operator.name}
                  </span>
                  {!operator.hasPin && (
                    <span className="text-muted-foreground text-xs">
                      Criar PIN
                    </span>
                  )}
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
