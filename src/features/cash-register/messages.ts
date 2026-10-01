export const CASH_REGISTER_CLOSED_MESSAGE =
  "O caixa está fechado. Abra o caixa para receber pagamentos.";

const CASH_REGISTER_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  TB017: CASH_REGISTER_CLOSED_MESSAGE,
  TB018: "Já existe um caixa aberto. Atualize a tela.",
  "42501": "Você não tem permissão para mexer no caixa.",
};

export function getCashRegisterErrorMessage(
  error: { code?: string },
  fallbackMessage: string,
): string {
  return (
    (error.code && CASH_REGISTER_ERROR_MESSAGES[error.code]) ?? fallbackMessage
  );
}
