"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldSeparator } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
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
      <FieldSeparator className="text-[13px]">ou</FieldSeparator>
      <Button
        type="button"
        variant="outline"
        disabled={isRedirecting}
        aria-busy={isRedirecting}
        onClick={handleGoogleSignIn}
        className="h-12 gap-2.5 rounded-[10px] text-[15px]"
      >
        {isRedirecting ? <Spinner aria-hidden /> : <GoogleIcon />}
        {label}
      </Button>
    </>
  );
}
