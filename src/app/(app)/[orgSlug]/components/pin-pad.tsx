"use client";

import { Delete } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export const MIN_PIN_LENGTH = 4;
export const MAX_PIN_LENGTH = 4;

const DIGIT_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const PAD_BUTTON_CLASS_NAME =
  "size-[4.5rem] rounded-full font-medium text-2xl tabular-nums";

type PinPadProps = {
  pin: string;
  isSubmitting: boolean;
  hasError: boolean;
  onAppendDigit: (digit: string) => void;
  onDeleteDigit: () => void;
  onSubmit: () => void;
  minLength?: number;
  maxLength?: number;
  submitLabel?: string;
};

export function PinPad({
  pin,
  isSubmitting,
  hasError,
  onAppendDigit,
  onDeleteDigit,
  onSubmit,
  minLength = MIN_PIN_LENGTH,
  maxLength = MAX_PIN_LENGTH,
  submitLabel = "Entrar",
}: PinPadProps) {
  const canSubmit = pin.length >= minLength && !isSubmitting;
  const latestRef = useRef({
    canSubmit,
    onAppendDigit,
    onDeleteDigit,
    onSubmit,
  });

  useEffect(() => {
    latestRef.current = { canSubmit, onAppendDigit, onDeleteDigit, onSubmit };
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const latest = latestRef.current;
      if (/^\d$/.test(event.key)) {
        latest.onAppendDigit(event.key);
      } else if (event.key === "Backspace") {
        latest.onDeleteDigit();
      } else if (event.key === "Enter" && latest.canSubmit) {
        latest.onSubmit();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col items-center gap-8">
      <div
        role="status"
        aria-label={`${pin.length} de até ${maxLength} dígitos digitados`}
        className={cn("flex h-4 gap-3", hasError && "animate-pulse")}
      >
        {Array.from({ length: maxLength }, (_, dotIndex) => (
          <span
            key={`pin-dot-${dotIndex.toString()}`}
            className={cn(
              "size-3.5 rounded-full border-2 border-primary/40 transition-colors",
              dotIndex < pin.length && "border-primary bg-primary",
              hasError && "border-destructive bg-destructive/20",
            )}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-x-6 gap-y-4">
        {DIGIT_KEYS.map((digit) => (
          <Button
            key={digit}
            type="button"
            variant="outline"
            className={PAD_BUTTON_CLASS_NAME}
            disabled={isSubmitting}
            onClick={() => onAppendDigit(digit)}
          >
            {digit}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          className={PAD_BUTTON_CLASS_NAME}
          aria-label="Apagar"
          disabled={isSubmitting || pin.length === 0}
          onClick={onDeleteDigit}
        >
          <Delete aria-hidden className="size-6" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className={PAD_BUTTON_CLASS_NAME}
          disabled={isSubmitting}
          onClick={() => onAppendDigit("0")}
        >
          0
        </Button>
        <Button
          type="button"
          className={cn(PAD_BUTTON_CLASS_NAME, "font-semibold text-sm")}
          disabled={!canSubmit}
          aria-busy={isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? <Spinner aria-hidden /> : submitLabel}
        </Button>
      </div>
    </div>
  );
}
