import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { getCurrentUser } from "@/features/auth/queries";
import { buildInvitationPath } from "@/features/team/invitation-link";
import { getInvitationPreview } from "@/features/team/queries";
import { buildAuthRoute, ROUTES } from "@/lib/routes";
import { AcceptInvitationButton } from "./components/accept-invitation-button";

export const metadata: Metadata = { title: "Convite" };

const UNAVAILABLE_MESSAGES = {
  accepted:
    "Esse convite já foi usado. Se precisar de acesso, peça um novo link.",
  expired: "Esse convite venceu. Peça um novo link para quem te convidou.",
} as const;

export default async function InvitationPage({
  params,
}: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const [invitation, currentUser] = await Promise.all([
    getInvitationPreview(token),
    getCurrentUser(),
  ]);

  if (!invitation) {
    return (
      <AuthHeader
        title="Convite não encontrado"
        description="Confira se o link está completo ou peça um novo para quem te convidou."
      />
    );
  }

  if (invitation.status !== "pending") {
    return (
      <AuthHeader
        title="Convite indisponível"
        description={UNAVAILABLE_MESSAGES[invitation.status]}
      />
    );
  }

  const invitationPath = buildInvitationPath(token);

  return (
    <div className="flex flex-col gap-10">
      <AuthHeader
        title={`Olá, ${invitation.inviteeName}!`}
        description={`Você foi convidado(a) para acessar o ${invitation.organizationName} no Tably.`}
      />
      {currentUser ? (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Você vai entrar como{" "}
            <span className="font-medium text-foreground">
              {currentUser.email}
            </span>
            .
          </p>
          <AcceptInvitationButton token={token} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Entre com a sua conta ou crie uma com o seu e-mail. Não use a senha
            de outra pessoa.
          </p>
          <Button
            className="h-11"
            nativeButton={false}
            render={
              <Link href={buildAuthRoute(ROUTES.signUp, invitationPath)} />
            }
          >
            Criar minha conta
          </Button>
          <Button
            variant="outline"
            className="h-11"
            nativeButton={false}
            render={
              <Link href={buildAuthRoute(ROUTES.login, invitationPath)} />
            }
          >
            Já tenho conta
          </Button>
        </div>
      )}
    </div>
  );
}
