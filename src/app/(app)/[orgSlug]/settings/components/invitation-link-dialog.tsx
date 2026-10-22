"use client";

import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Button } from "@/components/ui/button";
import { InvitationShareActions } from "./invitation-share-actions";

export type CreatedInvitation = {
  inviteeName: string;
  token: string;
};

type InvitationLinkDialogProps = {
  organizationName: string;
  invitation: CreatedInvitation | null;
  onClose: () => void;
};

export function InvitationLinkDialog({
  organizationName,
  invitation,
  onClose,
}: InvitationLinkDialogProps) {
  return (
    <DetailsDialog
      isOpen={invitation !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title="Convite criado"
      footer={
        <Button
          type="button"
          variant="outline"
          className={DIALOG_ACTION_BUTTON_CLASS_NAME}
          onClick={onClose}
        >
          Fechar
        </Button>
      }
    >
      {invitation && (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Mande o link para {invitation.inviteeName}. Ao abrir, a pessoa entra
            com o Google ou cria uma conta com o e-mail dela e já cai no{" "}
            {organizationName}. O link vale por 7 dias e só pode ser usado uma
            vez.
          </p>
          <InvitationShareActions
            organizationName={organizationName}
            inviteeName={invitation.inviteeName}
            token={invitation.token}
          />
        </div>
      )}
    </DetailsDialog>
  );
}
