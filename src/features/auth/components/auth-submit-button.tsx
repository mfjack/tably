import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

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
      isLoading={isPending}
      className="h-12 rounded-lg font-semibold text-[0.9375rem]"
    >
      {children}
    </Button>
  );
}
