"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldSeparator } from "@/components/ui/field";
import { useGoogleSignInMutation } from "../hooks/use-google-sign-in-mutation";
import { GoogleIcon } from "./google-icon";

type GoogleSignInProps = {
  label: string;
  nextPath?: string;
};

export function GoogleSignIn({ label, nextPath }: GoogleSignInProps) {
  const googleSignInMutation = useGoogleSignInMutation();
  const isRedirecting =
    googleSignInMutation.isPending || googleSignInMutation.isSuccess;

  function handleGoogleSignIn() {
    googleSignInMutation.mutate(nextPath, {
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <>
      <FieldSeparator className="text-[0.8125rem]">ou</FieldSeparator>
      <Button
        type="button"
        variant="outline"
        isLoading={isRedirecting}
        onClick={handleGoogleSignIn}
        className="h-12 gap-2.5 rounded-lg text-[0.9375rem]"
      >
        <GoogleIcon />
        {label}
      </Button>
    </>
  );
}
