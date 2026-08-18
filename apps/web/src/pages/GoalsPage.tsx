import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, ProgressBar, Spinner, ErrorBox, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useAddContribution, useCreateGoal, useDeleteGoal, useGoals } from "@/lib/queries";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { Goal } from "@/lib/types";

export function GoalsPage() {
  const { data, isLoading, isError } = useGoals();
  const [showNew, setShowNew] = useState(false);

  return (
    <>
      <PageHeader title="Metas Financeiras">
        <button className="btn-primary !py-2 !text-sm" onClick={() => setShowNew(true)}>+ Nova meta</button>
      </PageHeader>

      {isLoading && <Spinner />}
      {isError && <ErrorBox />}
      {data && !isLoading && (
        data.length === 0 ? (
          <EmptyState icon="target" text="Crie sua primeira meta (viagem, reserva, um objeto) e acompanhe o progresso dos aportes."
            action={<button className="btn-primary" onClick={() => setShowNew(true)}>+ Nova meta</button>} />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {data.map((g) => <GoalCard key={g.id} goal={g} />)}
          </div>
        )
      )}

      {showNew && <NewGoalModal onClose={() => setShowNew(false)} />}
    </>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const done = goal.progress >= 1;
  const addContribution = useAddContribution();
  const del = useDeleteGoal();
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg" style={{ background: `${goal.color}22`, color: goal.color }}>
            <Icon name={goal.icon} className="text-[22px]" />
          </span>
          <div>
            <p className="font-semibold">{goal.name}</p>
            <p className="text-xs text-on-surface-variant">{done ? "Concluída 🎉" : `Meta: ${formatCurrency(goal.targetAmount)}`}</p>
          </div>
        </div>
        <button onClick={() => del.mutate(goal.id)} className="text-on-surface-variant hover:text-error" title="Excluir">
          <Icon name="delete" className="text-[18px]" />
        </button>
      </div>

      <div className="mb-2 flex items-end justify-between">
        <span className="font-display text-2xl font-bold tabular">{formatCurrency(goal.savedAmount)}</span>
        <span className="tabular text-sm text-on-surface-variant">{formatPercent(goal.progress)}</span>
      </div>
      <ProgressBar value={goal.progress} color={done ? "#55e9a9" : goal.color} />
      <p className="mt-2 text-xs text-on-surface-variant">Faltam {formatCurrency(Math.max(goal.targetAmount - goal.savedAmount, 0))}</p>

      {adding ? (
        <div className="mt-3 flex gap-2">
          <input className="input !py-2 text-sm" type="number" step="0.01" placeholder="Valor do aporte" value={value} onChange={(e) => setValue(e.target.value)} />
          <button className="btn-primary !px-3 !py-2 !text-sm" disabled={addContribution.isPending}
            onClick={async () => {
              const v = Number(value.replace(",", "."));
              if (!v) return;
              await addContribution.mutateAsync({ goalId: goal.id, amount: v, date: new Date().toISOString() });
              setValue(""); setAdding(false);
            }}>OK</button>
        </div>
      ) : (
        <button className="mt-3 w-full rounded-lg border border-outline-variant/60 py-2 text-sm font-medium text-on-surface transition hover:bg-surface-container-high" onClick={() => setAdding(true)}>
          + Aporte
        </button>
      )}
    </Card>
  );
}

function NewGoalModal({ onClose }: { onClose: () => void }) {
  const create = useCreateGoal();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-md">
        <h2 className="mb-4 font-display text-2xl font-semibold">Nova meta</h2>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1"><span className="text-sm text-on-surface-variant">Nome</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Viagem" /></label>
          <label className="flex flex-col gap-1"><span className="text-sm text-on-surface-variant">Valor objetivo (R$)</span>
            <input className="input" type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0,00" /></label>
          {error && <p className="text-sm text-error">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={create.isPending}
            onClick={async () => {
              setError(null);
              const v = Number(target.replace(",", "."));
              if (!name.trim() || !v) return setError("Preencha nome e valor");
              await create.mutateAsync({ name: name.trim(), targetAmount: v });
              onClose();
            }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
