import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, Kpi, Spinner, ErrorBox, EmptyState, Modal } from "@/components/ui";
import { StackChart, type StackPoint } from "@/components/charts";
import { useCreateInvestment, useInvestments } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import type { Investment, InvestmentType } from "@/lib/types";

const TYPE_LABEL: Record<InvestmentType, string> = {
  RESERVE: "Reserva", FIXED_INCOME: "Renda fixa", VARIABLE_INCOME: "Renda variável",
};
const TYPE_COLOR: Record<InvestmentType, string> = {
  RESERVE: "#7c8cf8", FIXED_INCOME: "#55e9a9", VARIABLE_INCOME: "#f7c948",
};
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function InvestmentsPage() {
  const [year] = useState(new Date().getFullYear());
  const { data, isLoading, isError } = useInvestments(year);

  const totals = { RESERVE: 0, FIXED_INCOME: 0, VARIABLE_INCOME: 0 };
  (data ?? []).forEach((i) => (totals[i.type] += i.amount));
  const total = totals.RESERVE + totals.FIXED_INCOME + totals.VARIABLE_INCOME;

  // Agrupa por mês para o gráfico empilhado.
  const byMonth = new Map<number, { RESERVE: number; FIXED_INCOME: number; VARIABLE_INCOME: number }>();
  (data ?? []).forEach((i) => {
    const m = new Date(i.date).getUTCMonth();
    const cur = byMonth.get(m) ?? { RESERVE: 0, FIXED_INCOME: 0, VARIABLE_INCOME: 0 };
    cur[i.type] += i.amount;
    byMonth.set(m, cur);
  });
  const stack: StackPoint[] = [...byMonth.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([m, v]) => ({
      label: MONTHS[m]!,
      parts: [
        { name: "Reserva", value: v.RESERVE, color: TYPE_COLOR.RESERVE },
        { name: "Renda fixa", value: v.FIXED_INCOME, color: TYPE_COLOR.FIXED_INCOME },
        { name: "Renda variável", value: v.VARIABLE_INCOME, color: TYPE_COLOR.VARIABLE_INCOME },
      ],
    }));

  return (
    <>
      <PageHeader title="Investimentos e Reservas">
        <AddInvestment year={year} />
      </PageHeader>

      {isLoading && <Spinner />}
      {isError && <ErrorBox />}
      {data && !isLoading && (
        data.length === 0 ? (
          <EmptyState icon="account_balance_wallet" text="Você ainda não registrou investimentos. Adicione o primeiro para acompanhar a evolução do patrimônio." />
        ) : (
          <>
            <div className="mb-6 grid grid-cols-4 gap-4">
              <Kpi label="Total investido" value={total} icon="savings" accent />
              <Kpi label="Reserva" value={totals.RESERVE} icon="shield" />
              <Kpi label="Renda fixa" value={totals.FIXED_INCOME} icon="lock" />
              <Kpi label="Renda variável" value={totals.VARIABLE_INCOME} icon="show_chart" />
            </div>

            {stack.length > 0 && (
              <Card className="mb-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Evolução por mês</h3>
                  <div className="flex gap-4 text-xs text-on-surface-variant">
                    {(["RESERVE", "FIXED_INCOME", "VARIABLE_INCOME"] as InvestmentType[]).map((t) => (
                      <span key={t} className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLOR[t] }} />{TYPE_LABEL[t]}
                      </span>
                    ))}
                  </div>
                </div>
                <StackChart data={stack} />
              </Card>
            )}

            <Card>
              <h3 className="mb-3 text-lg font-semibold">Lançamentos</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-on-surface-variant">
                    <th className="pb-2 text-left font-medium">Tipo</th>
                    <th className="pb-2 text-left font-medium">Data</th>
                    <th className="pb-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data].sort((a, b) => +new Date(b.date) - +new Date(a.date)).map((inv: Investment) => (
                    <tr key={inv.id} className="border-t border-outline-variant/30">
                      <td className="py-3">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[inv.type] }} />
                          {TYPE_LABEL[inv.type]}
                        </span>
                      </td>
                      <td className="py-3 text-on-surface-variant">
                        {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(inv.date))}
                      </td>
                      <td className="py-3 text-right tabular text-invest">{formatCurrency(inv.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )
      )}
    </>
  );
}

function AddInvestment({ year }: { year: number }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<InvestmentType>("RESERVE");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const create = useCreateInvestment();

  async function handleSave() {
    const v = Number(amount.replace(",", "."));
    if (!v) return;
    await create.mutateAsync({ type, amount: v, date: new Date(date).toISOString() });
    setAmount(""); setOpen(false);
  }

  if (!open) return <button className="btn-primary !py-2 !text-sm" onClick={() => setOpen(true)}>+ Novo investimento</button>;

  return (
    <Modal onClose={() => setOpen(false)} onSubmit={handleSave} className="max-w-md">
        <h2 className="mb-4 font-display text-2xl font-semibold">Novo investimento</h2>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1"><span className="text-sm text-on-surface-variant">Tipo</span>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as InvestmentType)}>
              <option value="RESERVE">Reserva</option><option value="FIXED_INCOME">Renda fixa</option><option value="VARIABLE_INCOME">Renda variável</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1"><span className="text-sm text-on-surface-variant">Valor (R$)</span>
              <input className="input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></label>
            <label className="flex flex-col gap-1"><span className="text-sm text-on-surface-variant">Data</span>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>Salvar</button>
        </div>
        <span className="sr-only">{year}</span>
    </Modal>
  );
}
