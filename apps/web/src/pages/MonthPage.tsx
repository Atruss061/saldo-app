import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PeriodSelector } from "@/components/PeriodSelector";
import { Card, Chip, Kpi, ProgressBar, Toggle, Spinner, ErrorBox } from "@/components/ui";
import { Donut } from "@/components/charts";
import { Icon } from "@/components/Icon";
import { useTransactionModal } from "@/components/NewTransactionModal";
import {
  useApplyRecurring,
  useCategories,
  useMonthlyReport,
  useTransactions,
  useUpdateTransaction,
} from "@/lib/queries";
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

  // Filtros de busca
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterPay, setFilterPay] = useState("");
  const { data: categories } = useCategories();

  const step = (delta: number) => {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth() + 1);
  };

  // Gera automaticamente os gastos fixos do mês ao abrir/trocar de mês.
  const applyRecurring = useApplyRecurring();
  useEffect(() => {
    applyRecurring.mutate({ year, month });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const report = useMonthlyReport(year, month);
  const expenses = useTransactions({ year, month, type: "EXPENSE", pageSize: 100 });
  const incomes = useTransactions({ year, month, type: "INCOME", pageSize: 100 });

  const hasFilter = !!(search.trim() || filterCat || filterPay);
  const matchTx = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchText = (t: Transaction) =>
      !q || t.description.toLowerCase().includes(q) || (t.category?.name.toLowerCase().includes(q) ?? false);
    return (t: Transaction) =>
      matchText(t) &&
      (!filterCat || t.categoryId === filterCat) &&
      (!filterPay || t.paymentMethod === filterPay);
  }, [search, filterCat, filterPay]);

  const exp = (expenses.data?.transactions ?? []).filter(matchTx);
  const inc = (incomes.data?.transactions ?? []).filter((t) => {
    const q = search.trim().toLowerCase();
    return !q || t.description.toLowerCase().includes(q);
  });
  const fixos = exp.filter((t) => t.isFixed);
  const cartao = exp.filter((t) => !t.isFixed && t.paymentMethod === "CREDIT");
  const gastos = exp.filter((t) => !t.isFixed && t.paymentMethod !== "CREDIT");

  const isLoading = report.isLoading || expenses.isLoading || incomes.isLoading;

  return (
    <>
      <PageHeader title="Visão Mensal">
        <PeriodSelector label={formatMonthYear(year, month)} onPrev={() => step(-1)} onNext={() => step(1)} />
        <button className="btn-primary !py-2 !text-sm" onClick={() => open()}>+ Lançamento</button>
      </PageHeader>

      {/* Barra de busca e filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant" />
          <input
            className="input w-full pl-10"
            placeholder="Buscar por descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="input" value={filterPay} onChange={(e) => setFilterPay(e.target.value)}>
          <option value="">Todos os pagamentos</option>
          {Object.entries(PAYMENT_LABELS).map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        {hasFilter && (
          <button
            className="btn-ghost !py-2 !text-sm"
            onClick={() => { setSearch(""); setFilterCat(""); setFilterPay(""); }}
          >
            Limpar
          </button>
        )}
      </div>

      {isLoading && <Spinner />}
      {report.isError && <ErrorBox />}

      {report.data && !isLoading && (
        <>
          {!hasFilter && (
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
                    <button onClick={() => open()} className="text-sm font-medium text-primary">+ Adicionar</button>
                  </div>
                  {inc.length ? (
                    inc.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => open(e)}
                        className="flex w-full items-center justify-between border-t border-outline-variant/30 py-3 text-left transition first:border-0 hover:bg-surface-container/50"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
                            <Icon name="payments" className="text-[18px]" />
                          </span>
                          <span>
                            <span className="block font-medium">{e.description || "Entrada"}</span>
                            <span className="text-xs text-on-surface-variant">{e.isFixed ? "Fixo" : "Extra"}</span>
                          </span>
                        </span>
                        <span className="tabular font-medium text-income">{formatCurrency(e.amount)}</span>
                      </button>
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
            </>
          )}

          {hasFilter && (
            <p className="mb-4 text-sm text-on-surface-variant">
              Mostrando resultados do filtro. {exp.length + inc.length} lançamento(s) encontrado(s).
            </p>
          )}

          <TxTable title="Gastos Fixos" rows={fixos} variant="fixos" onEdit={open} />
          <TxTable title="Gastos do Mês (débito)" rows={gastos} variant="gastos" onEdit={open} />
          <TxTable title="Cartão de Crédito" rows={cartao} variant="cartao" onEdit={open} />
        </>
      )}
    </>
  );
}

function TxTable({
  title, rows, variant, onEdit,
}: {
  title: string;
  rows: Transaction[];
  variant: "fixos" | "gastos" | "cartao";
  onEdit: (tx: Transaction) => void;
}) {
  const update = useUpdateTransaction();
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
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr
                key={t.id}
                className="group cursor-pointer border-t border-outline-variant/30 transition hover:bg-surface-container/50"
                onClick={() => onEdit(t)}
              >
                <td className="py-3 font-medium">
                  {t.description || t.category?.name || (t.type === "INCOME" ? "Entrada" : "Gasto")}
                </td>
                {variant === "fixos" && (
                  <td className="py-3" onClick={(e) => e.stopPropagation()}>
                    <Toggle
                      on={t.isPaid}
                      onClick={() => update.mutate({ id: t.id, isPaid: !t.isPaid })}
                    />
                  </td>
                )}
                {variant === "fixos" && <td className="py-3 text-on-surface-variant">{PAYMENT_LABELS[t.paymentMethod]}</td>}
                {variant === "cartao" && <td className="py-3 text-on-surface-variant">{t.installments}x</td>}
                {variant !== "fixos" && <td className="py-3 text-on-surface-variant">{formatDate(t.date)}</td>}
                <td className="py-3">{t.category ? <Chip name={t.category.name} color={t.category.color} /> : <span className="text-on-surface-variant">—</span>}</td>
                <td className="py-3 text-right tabular text-expense">- {formatCurrency(t.amount)}</td>
                <td className="py-3 pl-2 text-right text-on-surface-variant opacity-0 transition group-hover:opacity-100">
                  <Icon name="edit" className="text-[18px]" />
                </td>
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
