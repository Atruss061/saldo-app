import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import type { ReactNode } from "react";

const CONTACT_EMAIL = "carloscesarf08@gmail.com";
const UPDATED = "agosto de 2026";

function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Icon name="diamond" filled className="text-[20px]" />
            </span>
            <span className="font-display text-xl font-bold text-primary">Saldo</span>
          </div>
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">
            Voltar
          </Link>
        </div>

        <h1 className="mb-1 font-display text-3xl font-bold text-on-surface">{title}</h1>
        <p className="mb-8 text-sm text-on-surface-variant">Última atualização: {UPDATED}</p>

        <div className="legal space-y-6 text-sm leading-relaxed text-on-surface-variant">{children}</div>

        <p className="mt-10 border-t border-outline-variant/40 pt-6 text-xs text-on-surface-variant">
          Dúvidas? Contacta-nos em{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </div>
  );
}

function H({ children }: { children: ReactNode }) {
  return <h2 className="mt-6 text-lg font-semibold text-on-surface">{children}</h2>;
}

export function PrivacyPage() {
  return (
    <LegalShell title="Política de Privacidade">
      <p>
        Esta Política de Privacidade explica como o Saldo ("nós") recolhe, utiliza e protege os teus dados
        pessoais quando usas a nossa aplicação de gestão financeira pessoal. Cumprimos o Regulamento Geral
        sobre a Proteção de Dados (RGPD/GDPR).
      </p>

      <H>Quem é o responsável pelo tratamento</H>
      <p>
        O responsável pelo tratamento dos teus dados é o Saldo. Para qualquer questão relacionada com
        privacidade, contacta-nos em <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
      </p>

      <H>Que dados recolhemos</H>
      <p>
        <b>Dados de conta:</b> nome, e-mail e palavra-passe (guardada de forma cifrada, nunca em texto simples).
      </p>
      <p>
        <b>Dados financeiros que introduzes:</b> lançamentos, categorias, objetivos e investimentos que
        registas na aplicação.
      </p>
      <p>
        <b>Dados bancários via Open Finance:</b> quando ligas voluntariamente uma conta bancária, importamos,
        com o teu consentimento explícito, informações como saldos, contas e transações. A ligação é feita
        através de um prestador de serviços de informação sobre contas licenciado (Enable Banking) e no
        ambiente do teu próprio banco — <b>nunca temos acesso às tuas credenciais bancárias</b> (palavra-passe do banco).
      </p>

      <H>Para que usamos os teus dados</H>
      <p>
        Usamos os teus dados exclusivamente para te prestar o serviço: mostrar a tua visão financeira,
        categorizar gastos, acompanhar orçamentos e objetivos, e manter o teu painel atualizado. Não vendemos
        os teus dados a terceiros nem os usamos para publicidade.
      </p>

      <H>Fundamento legal</H>
      <p>
        O tratamento assenta no teu <b>consentimento</b> (que podes retirar a qualquer momento) e na execução
        do contrato de prestação do serviço que solicitaste.
      </p>

      <H>Partilha de dados</H>
      <p>
        Partilhamos dados apenas com os prestadores estritamente necessários ao funcionamento do serviço
        (por exemplo, o agregador de Open Finance para a leitura bancária e a nossa infraestrutura de
        alojamento), que atuam como subcontratantes e estão obrigados a proteger os teus dados.
      </p>

      <H>Conservação</H>
      <p>
        Guardamos os teus dados enquanto a tua conta estiver ativa. Podes eliminar a tua conta a qualquer
        momento, e nesse caso os teus dados pessoais são apagados, salvo obrigação legal de conservação.
      </p>

      <H>Os teus direitos</H>
      <p>
        Tens o direito de aceder, retificar, apagar, limitar e opor-te ao tratamento dos teus dados, bem como
        o direito à portabilidade e a retirar o consentimento a qualquer momento. Podes também desligar uma
        conta bancária ligada quando quiseres, diretamente na aplicação. Para exercer estes direitos,
        contacta-nos em <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
      </p>

      <H>Segurança</H>
      <p>
        Aplicamos medidas técnicas e organizativas para proteger os teus dados, incluindo comunicação cifrada
        (HTTPS) e armazenamento seguro das credenciais.
      </p>

      <H>Alterações</H>
      <p>
        Podemos atualizar esta política periodicamente. A data da última atualização é indicada no topo desta
        página.
      </p>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Termos de Serviço">
      <p>
        Estes Termos regem a utilização da aplicação Saldo. Ao criar uma conta e utilizar o serviço, aceitas
        estes Termos.
      </p>

      <H>O serviço</H>
      <p>
        O Saldo é uma aplicação de gestão financeira pessoal que te ajuda a organizar entradas, despesas,
        contas fixas e objetivos. Podes introduzir dados manualmente ou, opcionalmente, ligar as tuas contas
        bancárias via Open Finance para importar transações automaticamente.
      </p>

      <H>Conta e elegibilidade</H>
      <p>
        Deves ter pelo menos 18 anos e fornecer informações verdadeiras. És responsável por manter a
        confidencialidade da tua palavra-passe e por toda a atividade na tua conta.
      </p>

      <H>Ligação bancária (Open Finance)</H>
      <p>
        A ligação a contas bancárias é opcional e feita com o teu consentimento explícito, através de um
        prestador licenciado, no ambiente do teu próprio banco. Autorizas apenas a <b>leitura</b> de
        informação (não realizamos pagamentos nem movimentações). Podes revogar o acesso a qualquer momento.
      </p>

      <H>Uso aceitável</H>
      <p>
        Concordas em não utilizar o serviço para fins ilícitos, nem tentar aceder a contas ou dados que não
        te pertencem, nem comprometer a segurança da aplicação.
      </p>

      <H>Sem aconselhamento financeiro</H>
      <p>
        O Saldo é uma ferramenta de organização e informação. Não constitui aconselhamento financeiro, fiscal
        ou de investimento. As decisões que tomes com base na informação apresentada são da tua
        responsabilidade.
      </p>

      <H>Limitação de responsabilidade</H>
      <p>
        O serviço é fornecido "tal como está". Na medida permitida por lei, não somos responsáveis por perdas
        indiretas resultantes do uso da aplicação. Esforçamo-nos por manter os dados corretos e disponíveis,
        mas não garantimos ausência de interrupções ou erros.
      </p>

      <H>Cancelamento</H>
      <p>
        Podes deixar de usar o serviço e eliminar a tua conta a qualquer momento. Podemos suspender contas que
        violem estes Termos.
      </p>

      <H>Alterações</H>
      <p>
        Podemos atualizar estes Termos periodicamente. A data da última atualização é indicada no topo desta
        página. Contacto: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
      </p>
    </LegalShell>
  );
}
