import {
  BarChart3,
  ChefHat,
  ClipboardList,
  MessageCircle,
  Package,
  QrCode,
  ShoppingCart,
  Users,
  Wallet,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  buildWhatsAppUrl,
  formatPlanPrice,
  LANDING_INFO,
  LANDING_PLANS,
} from "@/features/landing/landing-info";
import { ROUTES } from "@/lib/routes";
import { LandingPricing } from "./landing-pricing";
import { LandingShowcase } from "./landing-showcase";

const FEATURES = [
  {
    icon: ShoppingCart,
    title: "PDV rápido",
    description:
      "Venda em poucos toques, divida a conta, dê desconto e aplique a taxa de serviço.",
  },
  {
    icon: WifiOff,
    title: "Funciona sem internet",
    description:
      "A internet caiu? O PDV continua vendendo e sincroniza tudo quando a conexão voltar.",
  },
  {
    icon: ClipboardList,
    title: "Comandas",
    description:
      "Abra comandas pelo nome do cliente, adicione itens a qualquer momento e feche quando quiser.",
  },
  {
    icon: ChefHat,
    title: "Cozinha em tempo real",
    description:
      "Os pedidos chegam na tela da cozinha e na impressora térmica, com observações por item.",
  },
  {
    icon: Wallet,
    title: "Controle de caixa",
    description:
      "Abertura com troco, sangria, reforço e fechamento com a diferença do que foi contado.",
  },
  {
    icon: QrCode,
    title: "Cardápio digital",
    description:
      "Um QR Code na mesa: o cliente vê o cardápio e faz o pedido pelo celular.",
  },
  {
    icon: Package,
    title: "Estoque e ficha técnica",
    description:
      "Baixa automática dos insumos a cada venda, custo de cada produto e alerta de estoque mínimo.",
  },
  {
    icon: Users,
    title: "Equipe",
    description:
      "Operadores com PIN e permissões, ponto eletrônico, escalas e estimativa da folha.",
  },
  {
    icon: BarChart3,
    title: "Financeiro e relatórios",
    description:
      "Contas a pagar e receber, vendas por período, produtos mais vendidos e lucro bruto.",
  },
] as const;

const STEPS = [
  {
    title: "Crie sua conta",
    description: "Cadastro em menos de um minuto, com e-mail ou conta Google.",
  },
  {
    title: "Cadastre seus produtos",
    description: "Categorias, preços e, se quiser, a ficha técnica de cada um.",
  },
  {
    title: "Comece a vender",
    description: "Abra o caixa e use no computador, tablet ou celular.",
  },
] as const;

const WHATSAPP_MESSAGE = "Olá! Quero saber mais sobre o Tably.";

function getWhatsAppUrl() {
  return LANDING_INFO.whatsappNumber
    ? buildWhatsAppUrl(LANDING_INFO.whatsappNumber, WHATSAPP_MESSAGE)
    : null;
}

export function LandingPage() {
  const whatsAppUrl = getWhatsAppUrl();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href={ROUTES.home} className="flex items-center gap-2.5">
            <Logo />
            <span className="font-semibold text-lg">Tably</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="h-10"
              nativeButton={false}
              render={<Link href={ROUTES.login} />}
            >
              Entrar
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col gap-6">
            <h1 className="font-bold text-4xl tracking-tight sm:text-5xl">
              O sistema completo para cafeterias, restaurantes, lanchonetes e
              bares
            </h1>
            <p className="text-lg text-muted-foreground">
              PDV, comandas, cozinha, caixa, cardápio digital, estoque e
              financeiro em um só lugar. Simples de usar no balcão, completo
              para a gestão.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                className="h-12 px-6 text-base"
                nativeButton={false}
                render={<Link href={ROUTES.signUp} />}
              >
                Criar minha conta
              </Button>
              {whatsAppUrl && (
                <Button
                  variant="outline"
                  className="h-12 px-6 text-base"
                  nativeButton={false}
                  render={
                    <Link
                      href={whatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <MessageCircle aria-hidden />
                  Falar no WhatsApp
                </Button>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              Funciona no navegador do computador, tablet e celular. Sem
              instalar nada.
            </p>
          </div>
          <LandingShowcase />
        </section>

        <section className="border-t bg-muted/40">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:py-20">
            <div className="flex max-w-2xl flex-col gap-3">
              <h2 className="font-bold text-3xl tracking-tight">
                Tudo o que o dia a dia pede
              </h2>
              <p className="text-muted-foreground">
                Do primeiro pedido ao fechamento do caixa, sem planilhas e sem
                papel perdido.
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <li
                  key={title}
                  className="flex flex-col gap-3 rounded-2xl border bg-card p-5"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-muted-foreground text-sm">{description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="font-bold text-3xl tracking-tight">
            Comece em três passos
          </h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <LandingPricing />

        <section className="border-t bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <h2 className="font-bold text-3xl tracking-tight">
                Pronto para organizar o seu negócio?
              </h2>
              <p className="text-primary-foreground/80">
                {`Planos a partir de ${formatPlanPrice(LANDING_PLANS[0].monthlyPrice)}/mês.`}
              </p>
            </div>
            <Button
              variant="secondary"
              className="h-12 px-6 text-base"
              nativeButton={false}
              render={<Link href={ROUTES.signUp} />}
            >
              Criar minha conta
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-muted-foreground text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} Tably</span>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href={ROUTES.terms} className="hover:text-foreground">
              Termos de uso
            </Link>
            <Link href={ROUTES.privacy} className="hover:text-foreground">
              Política de privacidade
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
