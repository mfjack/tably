import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type AuthSubmitButtonProps = {
  isPending: boolean;
  children: ReactNode;
};

export function AuthSubmitButton({
  isPending,
  children,
}: AuthSubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={isPending}
      aria-busy={isPending}
      className="h-12 rounded-lg font-semibold text-[0.9375rem]"
    >
      {isPending && <Spinner aria-hidden />}
      {children}
    </Button>
  );
}
