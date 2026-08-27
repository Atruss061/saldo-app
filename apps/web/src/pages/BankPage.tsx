import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, Spinner, ErrorBox, EmptyState, Modal } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useConfirm } from "@/components/Confirm";
import { useT } from "@/lib/i18n";
import {
  useAspsps,
  useBankConnections,
  useStartBankAuth,
  useSyncBankConnection,
  useDeleteBankConnection,
} from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import type { BankConnection } from "@/lib/types";

export function BankPage() {
  const t = useT();
  const connections = useBankConnections();
  const syncConn = useSyncBankConnection();
  const deleteConn = useDeleteBankConnection();
  const confirm = useConfirm();

  const [picker, setPicker] = useState(false);
  const [notice, setNotice] = useState<string | null>(() => {
    // Mensagem de sucesso vinda do callback (?ligado=1).
    const p = new URLSearchParams(window.location.search);
    return p.get("ligado") === "1" ? "Banco ligado! As tuas transações estão a ser importadas." : null;
  });
  const [error, setError] = useState<string | null>(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("erro") ? "Não foi possível concluir a ligação. Tenta novamente." : null;
  });
  const [syncingId, setSyncingId] = useState<string | null>(null);

  async function handleSync(id: string) {
    setSyncingId(id);
    setNotice(null);
    setError(null);
    try {
      const res = await syncConn.mutateAsync(id);
      setNotice(`Sincronizado: ${res.imported} transação(ões) em ${res.accounts} conta(s).`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg ? `Não foi possível sincronizar: ${msg}` : "Não foi possível sincronizar agora.");
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDelete(conn: BankConnection) {
    const ok = await confirm({
      title: "Remover ligação?",
      message: `Isto desliga ${conn.connectorName || "o banco"} do Saldo. As transações já importadas ficam no teu histórico.`,
      confirmLabel: "Remover",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteConn.mutateAsync(conn.id);
      setNotice("Ligação removida.");
    } catch {
      setError("Não foi possível remover agora.");
    }
  }

  const list = connections.data ?? [];

  return (
    <>
      <PageHeader title={t("bank.title")} help={t("bank.help")}>
        <button className="btn-primary !py-2 !text-sm" onClick={() => setPicker(true)}>
          <Icon name="add_link" className="text-[18px]" /> {t("bank.connect")}
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

      <Card className="mb-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Icon name="lock" className="text-[20px]" />
          </span>
          <div className="text-sm text-on-surface-variant">
            <p className="mb-1 font-medium text-on-surface">{t("bank.secureTitle")}</p>
            <p>{t("bank.secureBody")}</p>
          </div>
        </div>
      </Card>

      {connections.isLoading && <Spinner />}
      {connections.isError && <ErrorBox />}

      {connections.data &&
        (list.length === 0 ? (
          <EmptyState icon="account_balance" text={t("bank.none")} />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {list.map((conn) => (
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
                    <p className="text-xs text-income">{t("bank.linked")}</p>
                  </div>
                </div>

                {conn.accounts.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {conn.accounts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 text-on-surface-variant">
                          <Icon name="savings" className="text-[16px]" />
                          {a.name || "Conta"}
                          {a.number ? <span className="opacity-60">·{a.number.slice(-4)}</span> : null}
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
                      ? new Date(conn.lastSyncedAt).toLocaleString()
                      : t("bank.notSynced")}
                  </span>
                  <div className="flex gap-2">
                    <button className="btn-ghost !py-1.5 !text-sm" onClick={() => handleSync(conn.id)} disabled={syncingId === conn.id}>
                      <Icon name="sync" className={`text-[18px] ${syncingId === conn.id ? "animate-spin" : ""}`} />
                      {syncingId === conn.id ? t("bank.syncing") : t("bank.sync")}
                    </button>
                    <button className="btn-ghost !py-1.5 !text-sm !text-expense hover:!bg-expense/10" onClick={() => handleDelete(conn)}>
                      <Icon name="link_off" className="text-[18px]" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}

      {picker && <BankPicker onClose={() => setPicker(false)} onError={(m) => { setPicker(false); setError(m); }} />}
    </>
  );
}

// Modal de escolha de banco: lista os bancos de PT; ao escolher, redireciona pro banco.
function BankPicker({ onClose, onError }: { onClose: () => void; onError: (m: string) => void }) {
  const t = useT();
  const { data, isLoading, isError } = useAspsps();
  const startAuth = useStartBankAuth();
  const [search, setSearch] = useState("");
  const [starting, setStarting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((a) => !q || a.name.toLowerCase().includes(q));
  }, [data, search]);

  async function pick(name: string) {
    setStarting(name);
    try {
      const url = await startAuth.mutateAsync({ aspspName: name, country: "PT" });
      window.location.href = url; // redireciona pro banco (Open Finance)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      onError(msg ? `Não foi possível iniciar a ligação: ${msg}` : "Não foi possível iniciar a ligação. Verifica a configuração do servidor.");
    }
  }

  return (
    <Modal onClose={onClose} className="max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">{t("bank.chooseBank")}</h2>
        <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface"><Icon name="close" /></button>
      </div>

      <input
        className="input mb-3 w-full"
        placeholder={t("bank.searchBank")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading && <Spinner />}
      {isError && <ErrorBox text="Não foi possível carregar os bancos. Verifica a configuração do Enable Banking no servidor." />}

      {data && (
        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-on-surface-variant">{t("bank.noBank")}</p>
          ) : (
            filtered.map((a) => (
              <button
                key={a.name}
                onClick={() => pick(a.name)}
                disabled={!!starting}
                className="flex w-full items-center gap-3 rounded-lg border-b border-outline-variant/20 px-2 py-3 text-left transition hover:bg-surface-container/50 disabled:opacity-60"
              >
                {a.logo ? (
                  <img src={a.logo} alt="" className="h-8 w-8 rounded object-contain" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded bg-surface-container-high text-on-surface-variant">
                    <Icon name="account_balance" className="text-[18px]" />
                  </span>
                )}
                <span className="flex-1 text-sm font-medium">{a.name}</span>
                {starting === a.name ? (
                  <Icon name="progress_activity" className="animate-spin text-[18px] text-primary" />
                ) : (
                  <Icon name="chevron_right" className="text-[18px] text-on-surface-variant" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}
