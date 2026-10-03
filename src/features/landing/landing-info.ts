import type { SubscriptionPlan } from "@/features/subscriptions/plans";

export const LANDING_INFO = {
  whatsappNumber: "22997823207",
} as const satisfies { whatsappNumber: string | null };

export type LandingPlan = {
  id: SubscriptionPlan;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: readonly string[];
  isHighlighted: boolean;
};

export const LANDING_PLANS = [
  {
    id: "essential",
    name: "Balcão",
    monthlyPrice: 49,
    yearlyPrice: 490,
    description: "Para cafeterias, lanchonetes e operações de balcão.",
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
    id: "management",
    name: "Gestão",
    monthlyPrice: 99,
    yearlyPrice: 990,
    description: "Para quem quer controlar custos e lucro.",
    features: [
      "Tudo do plano Balcão",
      "Estoque e ficha técnica dos produtos",
      "Fornecedores e compras",
      "Financeiro: contas a pagar e receber",
      "Fiado: conta de clientes",
      "Programa de fidelidade com selos",
      "Até 5 operadores",
    ],
    isHighlighted: true,
  },
  {
    id: "complete",
    name: "Equipe",
    monthlyPrice: 149,
    yearlyPrice: 1490,
    description: "Para quem tem equipe e quer tudo em um lugar.",
    features: [
      "Tudo do plano Gestão",
      "Funcionários, ponto e escalas",
      "Estimativa de folha, férias e 13º",
      "Operadores ilimitados",
    ],
    isHighlighted: false,
  },
] as const satisfies readonly LandingPlan[];

export function formatPlanPrice(price: number) {
  return `R$ ${price.toLocaleString("pt-BR")}`;
}

export function formatMonthlyEquivalent(yearlyPrice: number) {
  return `R$ ${(yearlyPrice / 12).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildWhatsAppUrl(phoneNumber: string, message: string) {
  return `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
}
