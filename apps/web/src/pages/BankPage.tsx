import { useState } from "react";
import { PluggyConnect } from "react-pluggy-connect";
import { PageHeader } from "@/components/PageHeader";
import { Card, Spinner, ErrorBox, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useConfirm } from "@/components/Confirm";
import {
  useBankConnections,
  useConnectToken,
  useSaveBankItem,
  useSyncBankConnection,
  useDeleteBankConnection,
} from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import type { BankConnection } from "@/lib/types";

// Traduz o status do item do Pluggy pra um rótulo amigável.
function statusLabel(status: string): { text: string; tone: string } {
  switch (status) {
    case "UPDATED":
      return { text: "Conectado", tone: "text-income" };
    case "UPDATING":
    case "WAITING_USER_INPUT":
      return { text: "Sincronizando…", tone: "text-on-surface-variant" };
    case "LOGIN_ERROR":
      return { text: "Erro de login — reconecte", tone: "text-expense" };
    case "OUTDATED":
      return { text: "Desatualizado — sincronize", tone: "text-expense" };
    default:
      return { text: status, tone: "text-on-surface-variant" };
  }
}

export function BankPage() {
  const connections = useBankConnections();
  const connectToken = useConnectToken();
  const saveItem = useSaveBankItem();
  const syncConn = useSyncBankConnection();
  const deleteConn = useDeleteBankConnection();
  const confirm = useConfirm();

  const [token, setToken] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  async function handleConnect() {
    setError(null);
    setNotice(null);
    try {
      const t = await connectToken.mutateAsync(undefined);
      setToken(t);
    } catch {
      setError(
        "Não foi possível iniciar a conexão. Verifique se as chaves do Pluggy estão configuradas no servidor."
      );
    }
  }

  async function handleWidgetSuccess(itemId: string) {
    setToken(null);
    try {
      await saveItem.mutateAsync(itemId);
      setNotice("Banco conectado! Estamos importando suas transações — pode levar alguns instantes.");
    } catch {
      setError("Conectou no banco, mas houve um erro ao salvar. Tente sincronizar novamente.");
    }
  }

  async function handleSync(id: string) {
    setSyncingId(id);
    setNotice(null);
    setError(null);
    try {
      const res = await syncConn.mutateAsync(id);
      setNotice(`Sincronizado: ${res.imported} transação(ões) atualizada(s).`);
    } catch {
      setError("Não foi possível sincronizar agora. Tente de novo em instantes.");
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDelete(conn: BankConnection) {
    const ok = await confirm({
      title: "Remover conexão?",
      message: `Isso desconecta ${conn.connectorName || "o banco"} do Saldo. As transações já importadas continuam no seu histórico.`,
      confirmLabel: "Remover",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteConn.mutateAsync(conn.id);
      setNotice("Conexão removida.");
    } catch {
      setError("Não foi possível remover agora. Tente de novo.");
    }
  }

  const list = connections.data ?? [];

  return (
    <>
      <PageHeader
        title="Conectar Banco"
        help="Conecte suas contas via Open Finance (Pluggy) para importar transações automaticamente, sem digitar."
      >
        <button className="btn-primary !py-2 !text-sm" onClick={handleConnect} disabled={connectToken.isPending}>
          <Icon name="add_link" className="text-[18px]" />
          {connectToken.isPending ? "Abrindo…" : "Conectar banco"}
        </button>
      </PageHeader>

      {notice && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-income/40 bg-income/10 p-3 text-sm text-on-surface">
          <Icon name="check_circle" className="text-[18px] text-income" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-expense/40 bg-expense/10 p-3 text-sm text-on-surface">
          <Icon name="error" className="text-[18px] text-expense" />
          <span>{error}</span>
        </div>
      )}

      {/* Explicação de segurança */}
      <Card className="mb-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Icon name="lock" className="text-[20px]" />
          </span>
          <div className="text-sm text-on-surface-variant">
            <p className="mb-1 font-medium text-on-surface">Seguro e sob seu controle</p>
            <p>
              A conexão é feita dentro do ambiente do seu próprio banco, via Open Finance — o Saldo
              <b> nunca vê sua senha</b>. Você autoriza só a leitura das transações e pode remover o acesso quando quiser.
            </p>
          </div>
        </div>
      </Card>

      {connections.isLoading && <Spinner />}
      {connections.isError && <ErrorBox />}

      {connections.data && (
        list.length === 0 ? (
          <EmptyState
            icon="account_balance"
            text="Nenhum banco conectado ainda. Clique em “Conectar banco” para importar suas transações automaticamente."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {list.map((conn) => {
              const st = statusLabel(conn.status);
              return (
                <Card key={conn.id}>
                  <div className="mb-3 flex items-center gap-3">
                    {conn.connectorImage ? (
                      <img src={conn.connectorImage} alt="" className="h-10 w-10 rounded-lg object-contain" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
                        <Icon name="account_balance" className="text-[20px]" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{conn.connectorName || "Banco"}</p>
                      <p className={`text-xs ${st.tone}`}>{st.text}</p>
                    </div>
                  </div>

                  {conn.accounts.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      {conn.accounts.map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-2 text-on-surface-variant">
                            <Icon
                              name={a.type === "CREDIT" ? "credit_card" : "savings"}
                              className="text-[16px]"
                            />
                            {a.name || (a.type === "CREDIT" ? "Cartão" : "Conta")}
                            {a.number ? <span className="opacity-60">·{a.number}</span> : null}
                          </span>
                          {a.balance != null && (
                            <span className="tabular text-on-surface-variant">{formatCurrency(a.balance)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-outline-variant/40 pt-3">
                    <span className="text-xs text-on-surface-variant">
                      {conn.lastSyncedAt
                        ? `Última sincronização: ${new Date(conn.lastSyncedAt).toLocaleString("pt-BR")}`
                        : "Ainda não sincronizado"}
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="btn-ghost !py-1.5 !text-sm"
                        onClick={() => handleSync(conn.id)}
                        disabled={syncingId === conn.id}
                      >
                        <Icon name="sync" className={`text-[18px] ${syncingId === conn.id ? "animate-spin" : ""}`} />
                        {syncingId === conn.id ? "Sincronizando…" : "Sincronizar"}
                      </button>
                      <button
                        className="btn-ghost !py-1.5 !text-sm !text-expense hover:!bg-expense/10"
                        onClick={() => handleDelete(conn)}
                      >
                        <Icon name="link_off" className="text-[18px]" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* Widget do Pluggy — renderiza só quando temos um token */}
      {token && (
        <PluggyConnect
          connectToken={token}
          includeSandbox
          onSuccess={(data) => void handleWidgetSuccess(data.item.id)}
          onError={(err) => {
            setToken(null);
            setError(err?.message || "A conexão foi cancelada ou falhou.");
          }}
          onClose={() => setToken(null)}
        />
      )}
    </>
  );
}
