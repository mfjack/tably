import type { Metadata } from "next";
import {
  LegalDocument,
  LegalList,
  LegalSection,
} from "@/features/legal/components/legal-document";
import { LEGAL_INFO } from "@/features/legal/legal-info";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Política de privacidade"
      lastUpdated={LEGAL_INFO.lastUpdated}
    >
      <LegalSection title="1. Quem somos">
        <p>
          O {LEGAL_INFO.productName} é um sistema de gestão para restaurantes,
          lanchonetes, bares e estabelecimentos similares, oferecido por{" "}
          {LEGAL_INFO.responsibleName}. Esta política explica quais dados
          pessoais tratamos, por que e quais são os seus direitos, conforme a
          Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).
        </p>
        <LegalList
          items={[
            "Somos controladores dos dados da sua conta de acesso (nome, e-mail e login).",
            "Somos operadores dos dados que cada estabelecimento cadastra sobre clientes, funcionários e fornecedores. Nesse caso, o controlador é o estabelecimento, e nós tratamos esses dados apenas para prestar o serviço.",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Dados que tratamos">
        <LegalList
          items={[
            "Conta: nome, e-mail, senha (guardada de forma criptografada pelo provedor de autenticação) e, se usar o login do Google, os dados básicos do perfil Google.",
            "Estabelecimento: nome, CNPJ, telefone, endereço e configurações.",
            "Operação: produtos, preços, pedidos, pagamentos, caixa, estoque, fornecedores e lançamentos financeiros.",
            "Clientes do estabelecimento: nome, telefone e histórico de contas a receber (fiado), quando cadastrados.",
            "Funcionários: nome, CPF, cargo, salário, escala, registros de ponto e cálculos de folha, quando cadastrados.",
            "Cardápio digital: nome informado pelo cliente, itens do pedido e um identificador aleatório do aparelho, usado para evitar abusos.",
            "Dados técnicos: cookies de sessão, dados guardados no aparelho para o modo offline e registros técnicos de acesso.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Para que usamos">
        <LegalList
          items={[
            "Prestar o serviço contratado: registrar vendas, imprimir pedidos, controlar caixa, estoque, financeiro, ponto e folha (execução de contrato).",
            "Manter a segurança, prevenir fraudes e abusos e corrigir falhas (legítimo interesse).",
            "Cumprir obrigações legais e responder a autoridades, quando exigido (obrigação legal).",
            "Comunicar mudanças no serviço e nestes documentos.",
          ]}
        />
        <p>
          Não vendemos dados pessoais e não os usamos para publicidade de
          terceiros.
        </p>
      </LegalSection>

      <LegalSection title="4. Com quem compartilhamos">
        <p>
          Usamos fornecedores de tecnologia para operar o serviço, que tratam os
          dados apenas sob nossas instruções:
        </p>
        <LegalList
          items={[
            "Supabase: banco de dados, autenticação e armazenamento de arquivos.",
            "Vercel: hospedagem do sistema.",
            "Google: login com conta Google, quando você escolhe essa opção.",
          ]}
        />
        <p>
          Esses fornecedores podem manter servidores fora do Brasil. Nesses
          casos, a transferência internacional ocorre com garantias de proteção
          compatíveis com a LGPD. Também podemos compartilhar dados quando
          exigido por lei ou ordem judicial.
        </p>
      </LegalSection>

      <LegalSection title="5. Segurança">
        <LegalList
          items={[
            "Conexões criptografadas (HTTPS).",
            "Cada estabelecimento só acessa os próprios dados, com regras de acesso aplicadas no banco de dados.",
            "Dados sensíveis, como salários, folha e documentos financeiros, ficam restritos a donos e gerentes.",
            "PINs de operadores e funcionários são guardados apenas de forma criptografada, com bloqueio após tentativas erradas.",
          ]}
        />
        <p>
          Nenhum sistema é totalmente imune a falhas. Em caso de incidente de
          segurança com risco relevante, avisaremos os envolvidos e as
          autoridades, como prevê a lei.
        </p>
      </LegalSection>

      <LegalSection title="6. Por quanto tempo guardamos">
        <p>
          Os dados ficam guardados enquanto a conta e o estabelecimento
          estiverem ativos. Ao excluir a conta, os dados são apagados, exceto os
          que precisarmos manter para cumprir obrigações legais ou exercer
          direitos, pelo prazo exigido.
        </p>
      </LegalSection>

      <LegalSection title="7. Seus direitos">
        <p>
          Você pode pedir a confirmação do tratamento, o acesso, a correção, a
          portabilidade, a anonimização ou a exclusão dos seus dados, além de
          informações sobre compartilhamento e a revogação de consentimento, nos
          termos do art. 18 da LGPD. Parte disso pode ser feita no próprio
          sistema, como editar o perfil e excluir a conta. Para o restante, fale
          com a gente pelo contato abaixo.
        </p>
        <p>
          Se você é cliente ou funcionário de um estabelecimento que usa o{" "}
          {LEGAL_INFO.productName}, faça o pedido diretamente ao
          estabelecimento, que é o responsável pelos seus dados. Nós o
          apoiaremos no atendimento.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies e armazenamento no aparelho">
        <p>
          Usamos cookies essenciais para manter você conectado e para a sessão
          dos operadores, e o armazenamento do navegador para o carrinho, o modo
          offline e preferências. Não usamos cookies de publicidade.
        </p>
      </LegalSection>

      <LegalSection title="9. Crianças e adolescentes">
        <p>
          O sistema é destinado a estabelecimentos e seus profissionais, e não é
          voltado a menores de 18 anos.
        </p>
      </LegalSection>

      <LegalSection title="10. Alterações">
        <p>
          Podemos atualizar esta política. Mudanças relevantes serão comunicadas
          no sistema ou por e-mail.
        </p>
      </LegalSection>

      <LegalSection title="11. Contato">
        <p>
          Para dúvidas ou pedidos sobre dados pessoais, fale com o responsável
          pelo tratamento, {LEGAL_INFO.responsibleName}:{" "}
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
