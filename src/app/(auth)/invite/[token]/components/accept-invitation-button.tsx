"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { useSignOutMutation } from "@/features/auth/hooks/use-sign-out-mutation";
import { useAcceptInvitationMutation } from "@/features/team/hooks/use-accept-invitation-mutation";
import { buildInvitationPath } from "@/features/team/invitation-link";

type AcceptInvitationButtonProps = {
  token: string;
};

export function AcceptInvitationButton({ token }: AcceptInvitationButtonProps) {
  const router = useRouter();
  const acceptMutation = useAcceptInvitationMutation(token);
  const signOutMutation = useSignOutMutation(buildInvitationPath(token));

  function acceptInvitation() {
    acceptMutation.mutate(undefined, {
      onSuccess: ({ organizationSlug }) => {
        router.replace(`/${organizationSlug}`);
        router.refresh();
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {acceptMutation.error && (
        <AuthAlert>{acceptMutation.error.message}</AuthAlert>
      )}
      <Button
        type="button"
        className="h-11"
        isLoading={acceptMutation.isPending}
        onClick={acceptInvitation}
      >
        Aceitar convite
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-11"
        isLoading={signOutMutation.isPending}
        onClick={() => signOutMutation.mutate()}
      >
        Entrar com outra conta
      </Button>
    </div>
  );
}
