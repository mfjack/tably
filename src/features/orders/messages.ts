import { CASH_REGISTER_CLOSED_MESSAGE } from "@/features/cash-register/messages";

export const CUSTOMER_NAME_IN_USE_MESSAGE =
  "Já existe uma comanda aberta ou um pedido na cozinha com esse nome. Use outro nome ou um sobrenome.";

const ORDER_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  P0002: "Algum produto não está mais disponível. Atualize a tela.",
  TB001:
    "Estoque insuficiente para algum produto. Registre a entrada dos insumos e tente de novo.",
  TB002: CUSTOMER_NAME_IN_USE_MESSAGE,
  TB003: "Essa comanda já foi fechada. Atualize a tela.",
  TB005: "Essa venda passa do limite de crédito da conta do cliente.",
  TB006: "A soma dos pagamentos não fecha o total do pedido.",
  TB017: CASH_REGISTER_CLOSED_MESSAGE,
  TB014:
    "Desconto inválido. Ele precisa ser maior que zero e menor que o total.",
  TB015: "O desconto está desligado nas configurações de vendas.",
  TB016: "A venda na conta está desligada nas configurações de vendas.",
  "22023": "Confira o pedido e o valor recebido.",
  "42501": "Você não tem permissão para vender neste estabelecimento.",
};

export function getOrderErrorMessage(
  error: { code?: string },
  fallbackMessage: string,
): string {
  return (error.code && ORDER_ERROR_MESSAGES[error.code]) ?? fallbackMessage;
}
