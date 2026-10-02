"use client";

import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSignOutMutation } from "@/features/auth/hooks/use-sign-out-mutation";

export function AdminSignOutButton() {
  const signOutMutation = useSignOutMutation();

  return (
    <Button
      type="button"
      variant="outline"
      className="h-10"
      disabled={signOutMutation.isPending}
      onClick={() =>
        signOutMutation.mutate(undefined, {
          onError: (error) => toast.error(error.message),
        })
      }
    >
      <LogOut aria-hidden />
      Sair
    </Button>
  );
}
