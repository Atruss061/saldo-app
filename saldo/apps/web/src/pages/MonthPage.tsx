import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PeriodSelector } from "@/components/PeriodSelector";
import { Card, Chip, Kpi, ProgressBar, Toggle, Spinner, ErrorBox } from "@/components/ui";
import { Donut } from "@/components/charts";
import { Icon } from "@/components/Icon";
import { useTransactionModal } from "@/components/NewTransactionModal";
import { useMonthlyReport, useTransactions } from "@/lib/queries";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/format";
import type { PaymentMethod, Transaction } from "@/lib/types";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  DEBIT: "Débito", CREDIT: "Cartão de Crédito", TRANSFER: "Transferência",
  AUTO_DEBIT: "Débito Automático", PIX: "Pix", CASH: "Dinheiro",
};
const PAY_COLORS = ["#55e9a9", "#7c8cf8", "#f7c948", "#ff7a5c", "#6ec6ff", "#b084ff"];

export function MonthPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { open } = useTransactionModal();

  const step = (delta: number) => {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth() + 1);
  };

  const report = useMonthlyReport(year, month);
  const expenses = useTransactions({ year, month, type: "EXPENSE", pageSize: 100 });
  const incomes = useTransactions({ year, month, type: "INCOME", pageSize: 100 });

  const exp = expenses.data?.transactions ?? [];
  const fixos = exp.filter((t) => t.isFixed);
  const cartao = exp.filter((t) => !t.isFixed && t.paymentMethod === "CREDIT");
  const gastos = exp.filter((t) => !t.isFixed && t.paymentMethod !== "CREDIT");

  const isLoading = report.isLoading || expenses.isLoading || incomes.isLoading;

  return (
    <>
      <PageHeader title="Visão Mensal">
        <PeriodSelector label={formatMonthYear(year, month)} onPrev={() => step(-1)} onNext={() => step(1)} />
        <button className="btn-primary !py-2 !text-sm" onClick={open}>+ Lançamento</button>
      </PageHeader>

      {isLoading && <Spinner />}
      {report.isError && <ErrorBox />}

      {report.data && !isLoading && (
        <>
          <div className="mb-6 grid grid-cols-4 gap-4">
            <Kpi label="Saldo do mês" value={report.data.totals.balance} icon="account_balance" accent />
            <Kpi label="Entradas" value={report.data.totals.income} icon="trending_up" />
            <Kpi label="Gastos do mês" value={report.data.totals.expense} icon="trending_down" />
            <Kpi label="Investido" value={report.data.totals.invested} icon="savings" />
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Entradas</h3>
                <button onClick={open} className="text-sm font-medium text-primary">+ Adicionar</button>
              </div>
              {incomes.data?.transactions.length ? (
                incomes.data.transactions.map((e) => (
                  <div key={e.id} className="flex items-center justify-between border-t border-outline-variant/30 py-3 first:border-0">
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
                        <Icon name="payments" className="text-[18px]" />
                      </span>
                      <span>
                        <span className="block font-medium">{e.description}</span>
                        <span className="text-xs text-on-surface-variant">{e.isFixed ? "Fixo" : "Extra"}</span>
                      </span>
                    </span>
                    <span className="tabular font-medium text-income">{formatCurrency(e.amount)}</span>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-on-surface-variant">Nenhuma entrada neste mês.</p>
              )}
            </Card>

            <Card>
              <h3 className="mb-4 text-lg font-semibold">Distribuição</h3>
              {report.data.byCategory.length ? (
                <div className="flex items-center gap-6">
                  <Donut items={report.data.byCategory.slice(0, 6).map((c) => ({ name: c.name, value: c.spent, color: c.color }))} />
                  <div className="flex-1 space-y-2">
                    {report.data.byCategory.slice(0, 6).map((c) => (
                      <div key={c.categoryId ?? c.name} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                          {c.name}
                        </span>
                        <span className="tabular text-on-surface-variant">{formatCurrency(c.spent)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-on-surface-variant">Sem gastos por categoria ainda.</p>
              )}
            </Card>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <Card>
              <h3 className="mb-3 text-lg font-semibold">
                Gastos por categoria <span className="text-sm font-normal text-on-surface-variant">(vs orçamento)</span>
              </h3>
              {report.data.byCategory.length ? (
                report.data.byCategory.map((c) => {
                  const over = c.expected > 0 && c.spent > c.expected;
                  const usage = c.expected > 0 ? c.spent / c.expected : 0;
                  return (
                    <div key={c.categoryId ?? c.name} className="mb-3">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                          {c.name}
                        </span>
                        <span className={`tabular ${over ? "text-expense" : "text-on-surface-variant"}`}>
                          {formatCurrency(c.spent)}{c.expected > 0 ? ` / ${formatCurrency(c.expected)}` : ""}
                        </span>
                      </div>
                      <ProgressBar value={usage} color={over ? "#e5686b" : c.color} height="h-1.5" />
                    </div>
                  );
                })
              ) : (
                <p className="py-6 text-center text-sm text-on-surface-variant">Defina orçamentos e lance gastos para ver aqui.</p>
              )}
            </Card>

            <Card>
              <h3 className="mb-4 text-lg font-semibold">Por tipo de pagamento</h3>
              {report.data.byPaymentMethod.length ? (
                (() => {
                  const total = report.data.byPaymentMethod.reduce((s, p) => s + p.total, 0) || 1;
                  return report.data.byPaymentMethod.map((p, i) => (
                    <div key={p.paymentMethod} className="mb-2">
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{PAYMENT_LABELS[p.paymentMethod]}</span>
                        <span className="tabular text-on-surface-variant">{formatCurrency(p.total)}</span>
                      </div>
                      <ProgressBar value={p.total / total} color={PAY_COLORS[i % PAY_COLORS.length]!} />
                    </div>
                  ));
                })()
              ) : (
                <p className="py-6 text-center text-sm text-on-surface-variant">Sem gastos neste mês.</p>
              )}
            </Card>
          </div>

          <TxTable title="Gastos Fixos" rows={fixos} variant="fixos" />
          <TxTable title="Gastos do Mês (débito)" rows={gastos} variant="gastos" />
          <TxTable title="Cartão de Crédito" rows={cartao} variant="cartao" />
        </>
      )}
    </>
  );
}

function TxTable({ title, rows, variant }: { title: string; rows: Transaction[]; variant: "fixos" | "gastos" | "cartao" }) {
  return (
    <Card className="mb-6">
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      {rows.length ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-on-surface-variant">
              <th className="pb-2 text-left font-medium">Nome</th>
              {variant === "fixos" && <th className="pb-2 text-left font-medium">Pago?</th>}
              {variant === "fixos" && <th className="pb-2 text-left font-medium">Tipo</th>}
              {variant === "cartao" && <th className="pb-2 text-left font-medium">Parcelas</th>}
              {variant !== "fixos" && <th className="pb-2 text-left font-medium">Data</th>}
              <th className="pb-2 text-left font-medium">Categoria</th>
              <th className="pb-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-outline-variant/30">
                <td className="py-3 font-medium">{t.description}</td>
                {variant === "fixos" && <td className="py-3"><Toggle on={t.isPaid} /></td>}
                {variant === "fixos" && <td className="py-3 text-on-surface-variant">{PAYMENT_LABELS[t.paymentMethod]}</td>}
                {variant === "cartao" && <td className="py-3 text-on-surface-variant">{t.installments}x</td>}
                {variant !== "fixos" && <td className="py-3 text-on-surface-variant">{formatDate(t.date)}</td>}
                <td className="py-3">{t.category ? <Chip name={t.category.name} color={t.category.color} /> : <span className="text-on-surface-variant">—</span>}</td>
                <td className="py-3 text-right tabular text-expense">- {formatCurrency(t.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="py-6 text-center text-sm text-on-surface-variant">Nada por aqui neste mês.</p>
      )}
    </Card>
  );
}
