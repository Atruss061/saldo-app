import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PeriodSelector } from "@/components/PeriodSelector";
import { Card, Kpi, Spinner, ErrorBox } from "@/components/ui";
import { BarChart, AreaChart } from "@/components/charts";
import { useAnnualReport } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";

export function DashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data, isLoading, isError } = useAnnualReport(year);

  return (
    <>
      <PageHeader title={`Visão Anual ${year}`}>
        <PeriodSelector label={String(year)} onPrev={() => setYear((y) => y - 1)} onNext={() => setYear((y) => y + 1)} />
      </PageHeader>

      {isLoading && <Spinner />}
      {isError && <ErrorBox />}
      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Kpi label="Entradas do ano" value={data.totals.income} icon="trending_up" />
            <Kpi label="Gastos do ano" value={data.totals.expense} icon="trending_down" />
            <Kpi label="Saldo do ano" value={data.totals.balance} icon="account_balance" accent />
            <Kpi label="Total investido" value={data.totals.invested} icon="savings" />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Fluxo de Caixa</h3>
                <div className="flex gap-4 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-income" />Entradas</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-expense" />Gastos</span>
                </div>
              </div>
              <BarChart data={data.months} />
            </Card>
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Evolução do Saldo</h3>
                <span className="chip bg-primary/15 text-primary">saldo mensal</span>
              </div>
              <AreaChart data={data.months} />
            </Card>
          </div>

          <Card>
            <h3 className="mb-4 text-lg font-semibold">Detalhamento Mensal</h3>
            <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-on-surface-variant">
                  <th className="pb-2 text-left font-medium">Mês</th>
                  <th className="pb-2 text-right font-medium">Entradas</th>
                  <th className="pb-2 text-right font-medium">Gastos</th>
                  <th className="pb-2 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m) => (
                  <tr key={m.month} className="border-t border-outline-variant/30">
                    <td className="py-3">{m.name}</td>
                    <td className="py-3 text-right tabular text-income">{formatCurrency(m.income)}</td>
                    <td className="py-3 text-right tabular text-expense">{formatCurrency(m.expense)}</td>
                    <td className={`py-3 text-right tabular ${m.balance < 0 ? "text-expense" : "text-on-surface"}`}>
                      {formatCurrency(m.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
