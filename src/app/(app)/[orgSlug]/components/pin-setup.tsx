"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { MAX_PIN_LENGTH, PinPad } from "./pin-pad";

type PinSetupStage = "enter" | "confirm";

type PinSetupProps = {
  personName: string;
  isSubmitting: boolean;
  onSubmit: (pin: string) => void;
};

export function PinSetup({
  personName,
  isSubmitting,
  onSubmit,
}: PinSetupProps) {
  const [stage, setStage] = useState<PinSetupStage>("enter");
  const [pin, setPin] = useState("");
  const [hasError, setHasError] = useState(false);
  const pinRef = useRef("");
  const firstPinRef = useRef("");

  function updatePin(nextPin: string) {
    pinRef.current = nextPin;
    setPin(nextPin);
  }

  function completePin(completedPin: string) {
    if (stage === "enter") {
      firstPinRef.current = completedPin;
      setStage("confirm");
      updatePin("");
      return;
    }
    if (completedPin !== firstPinRef.current) {
      toast.error("Os PINs não conferem. Crie de novo.");
      firstPinRef.current = "";
      setStage("enter");
      setHasError(true);
      updatePin("");
      return;
    }
    onSubmit(completedPin);
  }

  function appendDigit(digit: string) {
    if (isSubmitting) return;
    const currentPin = pinRef.current;
    if (currentPin.length >= MAX_PIN_LENGTH) return;
    const nextPin = currentPin + digit;
    setHasError(false);
    updatePin(nextPin);
    if (nextPin.length === MAX_PIN_LENGTH) completePin(nextPin);
  }

  function deleteDigit() {
    updatePin(pinRef.current.slice(0, -1));
    setHasError(false);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-semibold">
          {stage === "enter"
            ? `${personName}, crie seu PIN`
            : "Digite de novo para confirmar"}
        </p>
        <p className="max-w-xs text-muted-foreground text-sm">
          {stage === "enter"
            ? "Escolha 4 números fáceis de lembrar. Você vai usar para entrar e para bater o ponto."
            : "Assim evitamos erro de digitação."}
        </p>
      </div>
      <PinPad
        pin={pin}
        isSubmitting={isSubmitting}
        hasError={hasError}
        submitLabel="Criar"
        onAppendDigit={appendDigit}
        onDeleteDigit={deleteDigit}
        onSubmit={() => completePin(pinRef.current)}
      />
    </div>
  );
}
