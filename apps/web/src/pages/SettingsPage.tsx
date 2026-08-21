import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, Modal } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useConvertCurrency, useUpdateProfile } from "@/lib/queries";
import { CURRENCIES, currencyLabel } from "@/lib/currencies";
import { currencySymbol } from "@/lib/format";

export function SettingsPage() {
  const { user, updateCurrency } = useAuth();
  const current = user?.currency ?? "BRL";
  const [selected, setSelected] = useState(current);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const changed = selected !== current;

  return (
    <>
      <PageHeader title="Configurações" />

      <Card className="max-w-xl">
        <h3 className="text-lg font-semibold">Moeda</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          Define o símbolo e o formato usados em todo o app. Hoje: <b>{currencyLabel(current)}</b>.
        </p>

        <label className="mt-4 flex flex-col gap-1">
          <span className="text-sm text-on-surface-variant">Escolha a moeda</span>
          <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{currencyLabel(c.code)}</option>
            ))}
          </select>
        </label>

        <div className="mt-5 flex justify-end">
          <button className="btn-primary !py-2 !text-sm" disabled={!changed} onClick={() => setConfirmOpen(true)}>
            Salvar
          </button>
        </div>
      </Card>

      {confirmOpen && (
        <ChangeCurrencyModal
          from={current}
          to={selected}
          onDone={(newCode) => {
            updateCurrency(newCode);
            setConfirmOpen(false);
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}

function ChangeCurrencyModal({
  from,
  to,
  onDone,
  onCancel,
}: {
  from: string;
  to: string;
  onDone: (code: string) => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const updateProfile = useUpdateProfile();
  const convert = useConvertCurrency();
  const [mode, setMode] = useState<"symbol" | "convert">("symbol");
  const [perUnit, setPerUnit] = useState(""); // 1 <novaMoeda> = perUnit <moedaAtual>
  const [error, setError] = useState<string | null>(null);

  const oldSym = currencySymbol(from);
  const newSym = currencySymbol(to);
  const busy = updateProfile.isPending || convert.isPending;

  // preview da conversão de um valor exemplo (1000 na moeda atual)
  const rate = perUnit ? 1 / Number(perUnit.replace(",", ".")) : 0;
  const previewOld = new Intl.NumberFormat("pt-BR", { style: "currency", currency: from }).format(1000);
  const previewNew =
    rate > 0
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: to }).format(1000 * rate)
      : "—";

  async function handleConfirm() {
    setError(null);
    try {
      if (mode === "convert") {
        const per = Number(perUnit.replace(",", "."));
        if (!per || per <= 0) return setError("Informe quanto vale 1 " + newSym);
        await convert.mutateAsync({ currency: to, rate: 1 / per });
      } else {
        await updateProfile.mutateAsync({ currency: to });
      }
      await qc.invalidateQueries(); // recarrega tudo com a nova moeda/valores
      onDone(to);
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    }
  }

  return (
    <Modal onClose={onCancel} onSubmit={handleConfirm} className="max-w-lg">
      <h2 className="mb-1 font-display text-2xl font-semibold">
        Mudar para {newSym} ({to})
      </h2>
      <p className="mb-4 text-sm text-on-surface-variant">Como você quer tratar os valores já cadastrados?</p>

      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-outline-variant/50 p-3 text-sm">
          <input type="radio" name="mode" className="mt-1 accent-primary" checked={mode === "symbol"} onChange={() => setMode("symbol")} />
          <span>
            <span className="font-medium text-on-surface">Só trocar o símbolo</span>
            <span className="block text-xs text-on-surface-variant">
              Os números continuam iguais — só passam a aparecer como {newSym}. (Não converte.)
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-outline-variant/50 p-3 text-sm">
          <input type="radio" name="mode" className="mt-1 accent-primary" checked={mode === "convert"} onChange={() => setMode("convert")} />
          <span className="flex-1">
            <span className="font-medium text-on-surface">Converter os valores</span>
            <span className="block text-xs text-on-surface-variant">
              Multiplica todos os lançamentos, metas e investimentos pela cotação informada.
            </span>
          </span>
        </label>
      </div>

      {mode === "convert" && (
        <div className="mt-3 rounded-lg bg-surface-container-high/60 p-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-on-surface-variant">
              Cotação: 1 {newSym} equivale a quantos {oldSym}?
            </span>
            <input
              className="input"
              type="number"
              step="0.0001"
              value={perUnit}
              onChange={(e) => setPerUnit(e.target.value)}
              placeholder={`Ex.: 5 (1 ${newSym} = 5 ${oldSym})`}
            />
          </label>
          <p className="mt-2 text-xs text-on-surface-variant">
            Prévia: {previewOld} viram <b>{previewNew}</b>.
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-error">{error}</p>}

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Salvando…" : "Confirmar"}
        </button>
      </div>
    </Modal>
  );
}
