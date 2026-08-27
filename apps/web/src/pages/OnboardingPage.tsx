import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PluggyConnect } from "react-pluggy-connect";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "@/components/Icon";
import { useConnectToken, useCreateGoal, useSaveBankItem } from "@/lib/queries";
import { formatCurrency, currencySymbol } from "@/lib/format";

// Marca (no aparelho) que o usuário já passou pela configuração inicial.
export function markOnboarded(userId?: string) {
  try {
    localStorage.setItem(`saldo_onboarded_${userId ?? "anon"}`, "1");
  } catch {
    /* ignora */
  }
}

const PRAZOS = [
  { label: "6 meses", months: 6 },
  { label: "1 ano", months: 12 },
  { label: "2 anos", months: 24 },
] as const;

type GoalRow = { name: string; target: string; months: number };

const num = (s: string) => Number((s || "").replace(",", ".")) || 0;
function addMonthsISO(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

// Fluxo "banco primeiro": conectar o banco é o passo central; o app se preenche
// sozinho. Só pedimos à mão o que o banco não tem como saber (as metas).
const STEPS = ["Boas-vindas", "Conectar banco", "Metas", "Pronto"];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createGoal = useCreateGoal();
  const connectToken = useConnectToken();
  const saveItem = useSaveBankItem();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado da conexão bancária
  const [token, setToken] = useState<string | null>(null);
  const [bankConnected, setBankConnected] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  const [goals, setGoals] = useState<GoalRow[]>([{ name: "", target: "", months: 12 }]);

  const monthlyPerGoal = useMemo(
    () => goals.map((g) => (num(g.target) > 0 && g.months > 0 ? num(g.target) / g.months : 0)),
    [goals]
  );
  const totalMonthly = monthlyPerGoal.reduce((a, b) => a + b, 0);

  function skip() {
    markOnboarded(user?.id);
    navigate("/", { replace: true });
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else void finish();
  }

  async function handleConnect() {
    setBankError(null);
    try {
      const t = await connectToken.mutateAsync(undefined);
      setToken(t);
    } catch {
      setBankError("Não foi possível iniciar a conexão agora. Você pode tentar de novo ou fazer isso depois.");
    }
  }

  async function handleWidgetSuccess(itemId: string) {
    setToken(null);
    try {
      await saveItem.mutateAsync(itemId);
      setBankConnected(true);
    } catch {
      setBankError("Conectou no banco, mas houve um erro ao salvar. Você pode sincronizar depois em Configurações.");
    }
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      for (const g of goals) {
        if (g.name.trim() && num(g.target) > 0) {
          await createGoal.mutateAsync({
            name: g.name.trim(),
            targetAmount: num(g.target),
            targetDate: addMonthsISO(g.months),
          });
        }
      }
      markOnboarded(user?.id);
      navigate("/", { replace: true });
    } catch {
      setError("Algo deu errado ao salvar. Não se preocupe — você pode ajustar tudo depois direto no app.");
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Marca + progresso */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Icon name="diamond" filled className="text-[26px]" />
          </div>
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/50" : "w-3 bg-outline-variant/50"
                }`}
              />
            ))}
          </div>
        </div>

        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            if (!saving) next();
          }}
        >
          {/* ── Passo 0: Boas-vindas ── */}
          {step === 0 && (
            <div className="text-center">
              <h1 className="mb-2 font-display text-2xl font-semibold">
                Bem-vindo{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
              </h1>
              <p className="mb-4 text-sm text-on-surface-variant">
                O Saldo funciona sozinho: você conecta seu banco e ele já traz seus gastos e entradas
                automaticamente — sem digitar tudo na mão.
              </p>
              <p className="text-xs text-on-surface-variant">Leva 1 minuto. Pode pular e fazer depois se preferir.</p>
            </div>
          )}

          {/* ── Passo 1: Conectar banco (o momento mágico) ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold">Conecte seu banco</h2>
                <p className="text-sm text-on-surface-variant">
                  A conexão é feita no ambiente do seu próprio banco (Open Finance) — o Saldo <b>nunca vê sua senha</b>.
                  Depois disso, suas transações entram sozinhas.
                </p>
              </div>

              {bankConnected ? (
                <div className="flex items-center gap-3 rounded-lg border border-income/40 bg-income/10 p-4">
                  <Icon name="check_circle" className="text-[22px] text-income" />
                  <div className="text-sm">
                    <p className="font-medium text-on-surface">Banco conectado!</p>
                    <p className="text-on-surface-variant">Estamos importando suas transações — pode levar alguns instantes.</p>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connectToken.isPending}
                    className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary transition hover:brightness-105 disabled:opacity-60"
                  >
                    <Icon name="account_balance" className="text-[20px]" />
                    {connectToken.isPending ? "Abrindo…" : "Conectar meu banco"}
                  </button>
                  <p className="text-center text-xs text-on-surface-variant">
                    Prefere não conectar agora? Você pode adicionar tudo à mão depois, em Configurações.
                  </p>
                </>
              )}

              {bankError && <p className="text-sm text-error">{bankError}</p>}
            </div>
          )}

          {/* ── Passo 2: Metas (o que o banco não sabe) ── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold">Quais são suas metas?</h2>
                <p className="text-sm text-on-surface-variant">
                  Isso o banco não tem como saber — é o seu objetivo. Dê um nome, o valor e em quanto tempo.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                {goals.map((g, i) => (
                  <div key={i} className="rounded-lg border border-outline-variant/50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        className="input flex-1"
                        placeholder="Ex.: Viagem, Reserva, Carro"
                        value={g.name}
                        onChange={(e) => setGoals((arr) => arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      />
                      {goals.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setGoals((arr) => arr.filter((_, j) => j !== i))}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-expense/10 hover:text-expense"
                          aria-label="Remover meta"
                        >
                          <Icon name="delete" className="text-[18px]" />
                        </button>
                      )}
                    </div>
                    <div className="mb-2">
                      <input
                        className="input w-full"
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        placeholder={`Valor objetivo (${currencySymbol()})`}
                        value={g.target}
                        onChange={(e) => setGoals((arr) => arr.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)))}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PRAZOS.map((p) => (
                        <button
                          key={p.months}
                          type="button"
                          onClick={() => setGoals((arr) => arr.map((x, j) => (j === i ? { ...x, months: p.months } : x)))}
                          className={`rounded-full border px-3 py-1.5 text-sm transition ${
                            g.months === p.months ? "border-primary bg-primary/15 text-primary" : "border-outline-variant/60 text-on-surface-variant"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                      <label className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                        <input
                          className="input !w-16 !py-1.5 text-center"
                          type="number"
                          min="1"
                          max="600"
                          inputMode="numeric"
                          value={g.months}
                          onChange={(e) => setGoals((arr) => arr.map((x, j) => (j === i ? { ...x, months: Math.max(1, parseInt(e.target.value || "1", 10) || 1) } : x)))}
                        />
                        meses
                      </label>
                    </div>
                    {num(g.target) > 0 && g.months > 0 && (
                      <p className="mt-2 text-xs text-primary">
                        Guardando {formatCurrency(num(g.target) / g.months)}/mês você chega lá.
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setGoals((arr) => [...arr, { name: "", target: "", months: 12 }])}
                className="self-start text-sm font-medium text-primary hover:underline"
              >
                + Adicionar outra meta
              </button>
            </div>
          )}

          {/* ── Passo 3: Pronto ── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold">Tudo pronto! 🎉</h2>
                <p className="text-sm text-on-surface-variant">Confira antes de concluir.</p>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-surface-container-high px-3 py-2.5">
                  <span className="text-on-surface-variant">Banco conectado</span>
                  <span className={`font-medium ${bankConnected ? "text-income" : "text-on-surface-variant"}`}>
                    {bankConnected ? "Sim ✓" : "Ainda não"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface-container-high px-3 py-2.5">
                  <span className="text-on-surface-variant">Metas</span>
                  <span className="tabular font-medium">{goals.filter((g) => g.name.trim() && num(g.target) > 0).length}</span>
                </div>
              </div>

              {!bankConnected && (
                <p className="rounded-lg border border-outline-variant/50 p-3 text-xs text-on-surface-variant">
                  Você pode conectar seu banco quando quiser em <b>Configurações → Conectar Banco</b>, ou adicionar
                  gastos e entradas à mão.
                </p>
              )}

              {totalMonthly > 0 && (
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-center">
                  <p className="text-sm text-on-surface-variant">Para bater suas metas no prazo, guarde</p>
                  <p className="font-display text-2xl font-bold text-primary">{formatCurrency(totalMonthly)}/mês</p>
                </div>
              )}

              {error && <p className="text-sm text-error">{error}</p>}
            </div>
          )}

          {/* Navegação */}
          <div className="mt-6 flex items-center justify-between gap-3">
            {step > 0 ? (
              <button type="button" className="btn-ghost" onClick={() => setStep((s) => s - 1)} disabled={saving}>
                Voltar
              </button>
            ) : (
              <button type="button" className="btn-ghost !text-on-surface-variant" onClick={skip} disabled={saving}>
                Pular
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              {step === 0 ? "Começar" : step === STEPS.length - 1 ? (saving ? "Salvando…" : "Concluir") : "Próximo"}
            </button>
          </div>
        </form>

        {step > 0 && step < STEPS.length - 1 && (
          <p className="mt-4 text-center">
            <button className="text-xs text-on-surface-variant hover:underline" onClick={skip} disabled={saving}>
              Pular configuração e ir para o app
            </button>
          </p>
        )}
      </div>

      {/* Widget do Pluggy — renderiza só quando temos um token */}
      {token && (
        <PluggyConnect
          connectToken={token}
          includeSandbox
          onSuccess={(data) => void handleWidgetSuccess(data.item.id)}
          onError={(err) => {
            setToken(null);
            setBankError(err?.message || "A conexão foi cancelada ou falhou.");
          }}
          onClose={() => setToken(null)}
        />
      )}
    </div>
  );
}
