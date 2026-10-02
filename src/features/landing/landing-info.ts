export const LANDING_INFO = {
  whatsappNumber: "22997823207",
} as const satisfies { whatsappNumber: string | null };

export type LandingPlan = {
  name: string;
  monthlyPrice: number;
  description: string;
  features: readonly string[];
  isHighlighted: boolean;
};

export const LANDING_PLANS = [
  {
    name: "Essencial",
    monthlyPrice: 49,
    description: "Para lanchonetes e operações de balcão.",
    features: [
      "PDV que funciona sem internet",
      "Desconto, taxa de serviço e dividir conta",
      "Comandas e cozinha com impressão",
      "Abertura e fechamento de caixa",
      "Cardápio digital com QR Code",
      "Relatório de vendas",
      "Até 2 operadores",
    ],
    isHighlighted: false,
  },
  {
    name: "Gestão",
    monthlyPrice: 99,
    description: "Para quem quer controlar custos e lucro.",
    features: [
      "Tudo do Essencial",
      "Estoque e ficha técnica dos produtos",
      "Fornecedores e compras",
      "Financeiro: contas a pagar e receber",
      "Fiado: conta de clientes",
      "Até 5 operadores",
    ],
    isHighlighted: true,
  },
  {
    name: "Completo",
    monthlyPrice: 149,
    description: "Para quem tem equipe e quer tudo em um lugar.",
    features: [
      "Tudo do Gestão",
      "Funcionários, ponto e escalas",
      "Estimativa de folha, férias e 13º",
      "Operadores ilimitados",
    ],
    isHighlighted: false,
  },
] as const satisfies readonly LandingPlan[];

export function formatPlanPrice(monthlyPrice: number) {
  return `R$ ${monthlyPrice}`;
}

export function buildWhatsAppUrl(phoneNumber: string, message: string) {
  return `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
}
