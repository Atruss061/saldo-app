import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "@/components/Icon";
import { useApplyRecurring, useCreateGoal, useCreateRecurring } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";

// Marca (no aparelho) que o usuário já passou pela configuração inicial.
export function markOnboarded(userId?: string) {
  try {
    localStorage.setItem(`saldo_onboarded_${userId ?? "anon"}`, "1");
  } catch {
    /* ignora */
  }
}

const FIXED_PRESETS = [
  { key: "aluguel", label: "Aluguel / Financiamento", icon: "home" },
  { key: "energia", label: "Energia", icon: "bolt" },
  { key: "agua", label: "Água", icon: "water_drop" },
  { key: "internet", label: "Internet", icon: "wifi" },
  { key: "telefone", label: "Telefone / Celular", icon: "smartphone" },
  { key: "streaming", label: "Assinaturas / Streaming", icon: "movie" },
  { key: "academia", label: "Academia", icon: "fitness_center" },
  { key: "transporte", label: "Transporte", icon: "directions_bus" },
] as const;

const PRAZOS = [
  { label: "6 meses", months: 6 },
  { label: "1 ano", months: 12 },
  { label: "2 anos", months: 24 },
] as const;

type FixedState = Record<string, { checked: boolean; amount: string }>;
type GoalRow = { name: string; target: string; months: number };

const num = (s: string) => Number((s || "").replace(",", ".")) || 0;
const clampDay = (s: string) => Math.min(Math.max(parseInt(s || "1", 10) || 1, 1), 31);
function addMonthsISO(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

const STEPS = ["Boas-vindas", "Salário", "Gastos fixos", "Metas", "Resumo"];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createRecurring = useCreateRecurring();
  const createGoal = useCreateGoal();
  const applyRecurring = useApplyRecurring();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [salary, setSalary] = useState("");
  const [salaryDay, setSalaryDay] = useState("5");

  const [fixed, setFixed] = useState<FixedState>({});
  const [fixedDay, setFixedDay] = useState("10");

  const [goals, setGoals] = useState<GoalRow[]>([{ name: "", target: "", months: 12 }]);

  const salaryValue = num(salary);
  const monthlyPerGoal = useMemo(
    () => goals.map((g) => (num(g.target) > 0 && g.months > 0 ? num(g.target) / g.months : 0)),
    [goals]
  );
  const totalMonthly = monthlyPerGoal.reduce((a, b) => a + b, 0);
  const pctOfSalary = salaryValue > 0 ? totalMonthly / salaryValue : 0;

  function skip() {
    markOnboarded(user?.id);
    navigate("/", { replace: true });
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else void finish();
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      let createdAny = false;

      if (salaryValue > 0) {
        await createRecurring.mutateAsync({
          type: "INCOME",
          description: "Salário",
          amount: salaryValue,
          dayOfMonth: clampDay(salaryDay),
          startYear: year,
          startMonth: month,
          active: true,
        });
        createdAny = true;
      }

      const day = clampDay(fixedDay);
      for (const p of FIXED_PRESETS) {
        const f = fixed[p.key];
        if (f?.checked && num(f.amount) > 0) {
          await createRecurring.mutateAsync({
            type: "EXPENSE",
            description: p.label,
            amount: num(f.amount),
            dayOfMonth: day,
            startYear: year,
            startMonth: month,
            active: true,
          });
          createdAny = true;
        }
      }

      // Gera as ocorrências do mês atual para já aparecerem na Visão Mensal.
      if (createdAny) {
        await applyRecurring.mutateAsync({ year, month, force: true });
      }

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
                Vamos configurar o essencial em 1 minuto: seu salário, seus gastos fixos e suas metas.
                Assim o app já começa preenchido — sem digitar tudo na mão.
              </p>
              <p className="text-xs text-on-surface-variant">
                Pode pular qualquer parte e ajustar depois quando quiser.
              </p>
            </div>
          )}

          {/* ── Passo 1: Salário ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold">Quanto você recebe por mês?</h2>
                <p className="text-sm text-on-surface-variant">
                  Vira uma entrada fixa que entra sozinha todo mês. Deixe em branco se preferir.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-2 flex flex-col gap-1">
                  <span className="text-sm text-on-surface-variant">Salário (R$)</span>
                  {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
                  <input autoFocus className="input" type="number" step="0.01" inputMode="decimal" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0,00" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-on-surface-variant">Dia</span>
                  <input className="input" type="number" min="1" max="31" inputMode="numeric" value={salaryDay} onChange={(e) => setSalaryDay(e.target.value)} />
                </label>
              </div>
            </div>
          )}

          {/* ── Passo 2: Gastos fixos ── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold">O que você paga todo mês?</h2>
                <p className="text-sm text-on-surface-variant">
                  Marque os que tiver e coloque o valor. Cada um vira um gasto fixo automático.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-on-surface-variant">Vencem por volta do dia</span>
                <input className="input !w-16 !py-1.5 text-center" type="number" min="1" max="31" inputMode="numeric" value={fixedDay} onChange={(e) => setFixedDay(e.target.value)} />
              </label>
              <div className="flex flex-col gap-2">
                {FIXED_PRESETS.map((p) => {
                  const f = fixed[p.key] ?? { checked: false, amount: "" };
                  const toggle = () =>
                    setFixed((s) => ({ ...s, [p.key]: { checked: !f.checked, amount: f.amount } }));
                  return (
                    <div
                      key={p.key}
                      className={`flex items-center gap-3 rounded-lg border p-2.5 transition ${
                        f.checked ? "border-primary/60 bg-primary/5" : "border-outline-variant/50"
                      }`}
                    >
                      <button type="button" onClick={toggle} className="flex flex-1 items-center gap-3 text-left">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded border ${
                            f.checked ? "border-primary bg-primary text-on-primary" : "border-outline-variant"
                          }`}
                        >
                          {f.checked && <Icon name="check" className="text-[14px]" />}
                        </span>
                        <Icon name={p.icon} className="text-[20px] text-on-surface-variant" />
                        <span className="text-sm font-medium">{p.label}</span>
                      </button>
                      {f.checked && (
                        <input
                          className="input !w-28 !py-1.5"
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          placeholder="R$ 0,00"
                          value={f.amount}
                          onChange={(e) =>
                            setFixed((s) => ({ ...s, [p.key]: { checked: true, amount: e.target.value } }))
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Passo 3: Metas ── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold">Quais são suas metas?</h2>
                <p className="text-sm text-on-surface-variant">
                  Dê um nome, o valor que quer juntar e em quanto tempo.
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
                        placeholder="Valor objetivo (R$)"
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

          {/* ── Passo 4: Resumo ── */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold">Tudo pronto! 🎉</h2>
                <p className="text-sm text-on-surface-variant">Confira o resumo antes de concluir.</p>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-surface-container-high px-3 py-2.5">
                  <span className="text-on-surface-variant">Salário mensal</span>
                  <span className="tabular font-medium text-income">{salaryValue > 0 ? formatCurrency(salaryValue) : "—"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface-container-high px-3 py-2.5">
                  <span className="text-on-surface-variant">Gastos fixos marcados</span>
                  <span className="tabular font-medium">
                    {FIXED_PRESETS.filter((p) => fixed[p.key]?.checked && num(fixed[p.key]!.amount) > 0).length}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface-container-high px-3 py-2.5">
                  <span className="text-on-surface-variant">Metas</span>
                  <span className="tabular font-medium">{goals.filter((g) => g.name.trim() && num(g.target) > 0).length}</span>
                </div>
              </div>

              {totalMonthly > 0 && (
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-center">
                  <p className="text-sm text-on-surface-variant">Para bater suas metas no prazo, guarde</p>
                  <p className="font-display text-2xl font-bold text-primary">{formatCurrency(totalMonthly)}/mês</p>
                  {salaryValue > 0 && (
                    <p className={`mt-1 text-xs ${pctOfSalary > 0.5 ? "text-expense" : "text-on-surface-variant"}`}>
                      Isso é {Math.round(pctOfSalary * 100)}% do seu salário
                      {pctOfSalary > 0.5 ? " — pode ser puxado, considere ampliar o prazo." : "."}
                    </p>
                  )}
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
    </div>
  );
}
