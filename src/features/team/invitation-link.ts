export function buildInvitationPath(token: string): string {
  return `/invite/${token}`;
}

export function buildInvitationMessage(
  organizationName: string,
  inviteeName: string,
  invitationUrl: string,
): string {
  return `Olá, ${inviteeName}! Você foi convidado(a) para acessar o ${organizationName} no Tably. Entre pelo link: ${invitationUrl}`;
}
