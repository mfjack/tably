const ONLINE_ORDER_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  P0002:
    "Algum item não está mais disponível. Atualize a página e monte o pedido de novo.",
  TB001:
    "Estoque insuficiente para algum item. Recuse o pedido ou registre a entrada dos insumos.",
  TB010:
    "No momento não estamos recebendo pedidos pelo cardápio. Faça o pedido no balcão.",
  TB011:
    "Muitos pedidos em pouco tempo. Aguarde alguns minutos ou faça o pedido no balcão.",
  TB012: "Esse pedido já foi aceito ou recusado em outro aparelho.",
  "22023": "Confira o pedido e tente de novo.",
  "42501": "Você não tem permissão para esse pedido.",
};

export function getOnlineOrderErrorMessage(
  error: { code?: string },
  fallbackMessage: string,
): string {
  return (
    (error.code && ONLINE_ORDER_ERROR_MESSAGES[error.code]) ?? fallbackMessage
  );
}
