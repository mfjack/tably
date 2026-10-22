"use client";

import { Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWhatsAppShareUrl } from "@/components/whatsapp-link";
import {
  buildInvitationMessage,
  buildInvitationPath,
} from "@/features/team/invitation-link";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

type InvitationShareActionsProps = {
  organizationName: string;
  inviteeName: string;
  token: string;
};

export function InvitationShareActions({
  organizationName,
  inviteeName,
  token,
}: InvitationShareActionsProps) {
  function getInvitationUrl() {
    return `${window.location.origin}${buildInvitationPath(token)}`;
  }

  function shareOnWhatsApp() {
    window.open(
      getWhatsAppShareUrl(
        buildInvitationMessage(
          organizationName,
          inviteeName,
          getInvitationUrl(),
        ),
      ),
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button type="button" size="sm" onClick={shareOnWhatsApp}>
        <MessageCircle aria-hidden />
        WhatsApp
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => copyToClipboard(getInvitationUrl(), "Link copiado.")}
      >
        <Copy aria-hidden />
        Copiar link
      </Button>
    </div>
  );
}
