import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui";
import { Icon } from "@/components/Icon";

// Portugal: a ligação automática ao banco (via Open Finance europeu) chega numa
// próxima fase. Por agora, esta página é informativa.
export function BankPage() {
  return (
    <>
      <PageHeader title="Ligar Banco" />

      <Card className="mx-auto max-w-xl text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Icon name="account_balance" className="text-[28px]" />
        </span>
        <h3 className="mb-2 text-lg font-semibold">Ligação automática ao banco — em breve</h3>
        <p className="mx-auto max-w-md text-sm text-on-surface-variant">
          Estamos a preparar a ligação aos bancos de Portugal via Open Finance, para importar as tuas
          transações automaticamente — sem digitar nada.
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm text-on-surface-variant">
          Enquanto isso, adiciona as tuas entradas e despesas manualmente. É rápido, e assim que a ligação
          estiver disponível o teu histórico continua intacto.
        </p>
      </Card>
    </>
  );
}
