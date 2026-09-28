import type { AuthError } from "@supabase/supabase-js";

const AUTH_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  invalid_credentials: "Email ou senha incorretos.",
  email_not_confirmed:
    "Confirme seu email antes de entrar. Verifique sua caixa de entrada.",
  user_already_exists: "Já existe uma conta com este email.",
  email_exists: "Já existe uma conta com este email.",
  weak_password: "Essa senha é fraca demais. Tente uma mais forte.",
  same_password: "A nova senha precisa ser diferente da atual.",
  over_email_send_rate_limit:
    "Muitos emails enviados. Aguarde alguns minutos e tente de novo.",
  over_request_rate_limit:
    "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  signup_disabled: "Novos cadastros estão desativados no momento.",
};

export const GENERIC_ERROR_MESSAGE =
  "Algo deu errado. Tente novamente em instantes.";

export const INVALID_FORM_MESSAGE = "Confira os campos e tente novamente.";

export function getAuthErrorMessage(error: AuthError): string {
  return (
    (error.code && AUTH_ERROR_MESSAGES[error.code]) ?? GENERIC_ERROR_MESSAGE
  );
}

export function isRateLimitError(error: AuthError): boolean {
  return error.code?.startsWith("over_") ?? false;
}
