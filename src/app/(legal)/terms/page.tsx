import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalDocument,
  LegalList,
  LegalSection,
} from "@/features/legal/components/legal-document";
import { LEGAL_INFO } from "@/features/legal/legal-info";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermsPage() {
  return (
    <LegalDocument title="Termos de uso" lastUpdated={LEGAL_INFO.lastUpdated}>
      <LegalSection title="1. Aceitação">
        <p>
          Estes termos regulam o uso do {LEGAL_INFO.productName}, sistema de
          gestão para restaurantes, lanchonetes, bares e estabelecimentos
          similares, oferecido por {LEGAL_INFO.responsibleName}. Ao criar uma
          conta ou um estabelecimento, você declara que leu e concorda com estes
          termos e com a{" "}
          <Link href={ROUTES.privacy} className="underline underline-offset-4">
            Política de privacidade
          </Link>
          . Se você usa o sistema em nome de uma empresa, declara ter poderes
          para aceitá-los por ela.
        </p>
      </LegalSection>

      <LegalSection title="2. O serviço">
        <p>
          O {LEGAL_INFO.productName} oferece, entre outras funcionalidades:
          ponto de venda (PDV), comandas, tela da cozinha, impressão de pedidos,
          controle de caixa, cardápio digital com pedidos pelo celular, estoque
          e ficha técnica, contas de clientes (fiado), fornecedores, financeiro,
          funcionários, ponto, folha de pagamento estimada e relatórios. As
          funcionalidades podem mudar, ser melhoradas ou descontinuadas ao longo
          do tempo.
        </p>
      </LegalSection>

      <LegalSection title="3. Conta, operadores e segurança">
        <LegalList
          items={[
            "Você é responsável pelos dados informados no cadastro e por mantê-los atualizados.",
            "O dono do estabelecimento responde pelas pessoas a quem dá acesso, como gerentes, operadores e funcionários, e pelas permissões que define para cada um.",
            "Senhas e PINs são pessoais. Não compartilhe e avise imediatamente se suspeitar de uso indevido.",
            "Ações feitas com o seu acesso ou com o PIN de um operador são consideradas feitas pelo estabelecimento.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Uso permitido">
        <p>Ao usar o sistema, você se compromete a não:</p>
        <LegalList
          items={[
            "usar o serviço para atividades ilegais ou fraudulentas;",
            "tentar acessar dados de outros estabelecimentos ou burlar controles de acesso;",
            "sobrecarregar, copiar ou fazer engenharia reversa do sistema;",
            "inserir conteúdo ofensivo, ou dados de terceiros sem base legal para isso.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Dados do estabelecimento">
        <p>
          Os dados que você cadastra (produtos, vendas, clientes, funcionários,
          fornecedores, lançamentos financeiros e demais informações) pertencem
          ao seu estabelecimento. Em relação aos dados pessoais de clientes e
          funcionários inseridos no sistema, o estabelecimento é o controlador e
          o {LEGAL_INFO.productName} atua como operador, tratando esses dados
          apenas para prestar o serviço, conforme a Lei Geral de Proteção de
          Dados (LGPD). Cabe ao estabelecimento informar seus clientes e
          funcionários sobre esse uso e atender aos pedidos deles.
        </p>
      </LegalSection>

      <LegalSection title="6. Pagamento">
        <p>
          O uso do sistema pode ser cobrado conforme o plano e o valor
          combinados com o estabelecimento. A falta de pagamento pode levar à
          suspensão do acesso após aviso. Os valores podem ser reajustados, com
          comunicação prévia.
        </p>
      </LegalSection>

      <LegalSection title="7. Disponibilidade">
        <p>
          Trabalhamos para manter o serviço disponível e seguro, mas ele pode
          passar por instabilidades, manutenções ou falhas de serviços de
          terceiros, como hospedagem e internet. O PDV possui modo offline para
          reduzir o impacto de quedas de conexão, mas não há garantia de
          funcionamento ininterrupto.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitações de responsabilidade">
        <LegalList
          items={[
            "O sistema é uma ferramenta de gestão. As decisões tomadas com base nele são do estabelecimento.",
            "Os cálculos de folha de pagamento, encargos, férias e 13º são estimativas e não substituem um contador.",
            "O sistema não emite nota fiscal nem substitui obrigações fiscais e trabalhistas do estabelecimento.",
            "Não nos responsabilizamos por perdas causadas por uso indevido, dados incorretos informados pelo usuário, compartilhamento de senhas ou falhas de equipamentos, como impressoras e computadores.",
            "Quando permitido por lei, nossa responsabilidade fica limitada ao valor pago pelo serviço nos 3 meses anteriores ao fato.",
          ]}
        />
      </LegalSection>

      <LegalSection title="9. Cancelamento e exclusão">
        <p>
          Você pode parar de usar o sistema a qualquer momento e excluir sua
          conta em Configurações → Meu perfil. Ao excluir a conta, os
          estabelecimentos dos quais você é o único dono e seus dados são
          apagados de forma definitiva, exceto o que precisarmos guardar por
          obrigação legal. Podemos encerrar contas que violem estes termos.
        </p>
      </LegalSection>

      <LegalSection title="10. Alterações nestes termos">
        <p>
          Podemos atualizar estes termos. Mudanças relevantes serão comunicadas
          no sistema ou por e-mail. Continuar usando o serviço após a mudança
          significa concordar com a nova versão.
        </p>
      </LegalSection>

      <LegalSection title="11. Lei aplicável e foro">
        <p>
          Estes termos seguem as leis brasileiras. Fica eleito o foro da comarca
          de {LEGAL_INFO.forumCity}, salvo quando a lei garantir outro foro ao
          usuário.
        </p>
      </LegalSection>

      <LegalSection title="12. Contato">
        <p>
          Dúvidas sobre estes termos:{" "}
          <a
            href={`mailto:${LEGAL_INFO.contactEmail}`}
            className="underline underline-offset-4"
          >
            {LEGAL_INFO.contactEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
