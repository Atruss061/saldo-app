import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, Chip, Spinner, ErrorBox, EmptyState, Toggle } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useConfirm } from "@/components/Confirm";
import {
  useApplyRecurring,
  useCategories,
  useCreateRecurring,
  useDeleteRecurring,
  useRecurring,
  useUpdateRecurring,
} from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import type { PaymentMethod, RecurringExpense, TransactionType } from "@/lib/types";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  DEBIT: "Débito", CREDIT: "Cartão de Crédito", TRANSFER: "Transferência",
  AUTO_DEBIT: "Débito Automático", PIX: "Pix", CASH: "Dinheiro",
};
const PAYMENTS = Object.entries(PAYMENT_LABELS) as [PaymentMethod, string][];

export function RecurringPage() {
  const { data, isLoading, isError } = useRecurring();
  const apply = useApplyRecurring();
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [showForm, setShowForm] = useState(false);

  const openNew = () => { setEditing(null); setShowForm(true); };
  const openEdit = (r: RecurringExpense) => { setEditing(r); setShowForm(true); };

  const generateThisMonth = () => {
    const now = new Date();
    apply.mutate({ year: now.getFullYear(), month: now.getMonth() + 1, force: true });
  };

  return (
    <>
      <PageHeader title="Gastos Fixos">
        <button className="btn-ghost !py-2 !text-sm" onClick={generateThisMonth} disabled={apply.isPending}>
          <Icon name="autorenew" className="text-[18px]" /> Gerar deste mês
        </button>
        <button className="btn-primary !py-2 !text-sm" onClick={openNew}>+ Novo fixo</button>
      </PageHeader>

      <p className="mb-6 max-w-2xl text-sm text-on-surface-variant">
        Cadastre aqui o que se repete todo mês (aluguel, assinaturas, mensalidades…). Eles entram
        automaticamente na Visão Mensal de cada mês novo. Você pode editar ou remover a ocorrência
        de um mês específico sem afetar os outros.
      </p>

      {isLoading && <Spinner />}
      {isError && <ErrorBox />}
      {data && !isLoading && (
        data.length === 0 ? (
          <EmptyState
            icon="autorenew"
            text="Nenhum gasto fixo cadastrado ainda."
            action={<button className="btn-primary" onClick={openNew}>+ Novo fixo</button>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {data.map((r) => <RecurringCard key={r.id} rec={r} onEdit={() => openEdit(r)} />)}
          </div>
        )
      )}

      {showForm && <RecurringForm editing={editing} onClose={() => setShowForm(false)} />}
    </>
  );
}

function RecurringCard({ rec, onEdit }: { rec: RecurringExpense; onEdit: () => void }) {
  const del = useDeleteRecurring();
  const update = useUpdateRecurring();
  const confirm = useConfirm();

  async function handleDelete() {
    const ok = await confirm({
      title: "Excluir gasto fixo?",
      message: `"${rec.description}" deixará de ser gerado nos próximos meses. As ocorrências já lançadas são mantidas.`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (ok) del.mutate(rec.id);
  }

  return (
    <Card className={`flex items-start gap-3 !p-5 ${rec.active ? "" : "opacity-60"}`}>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${rec.category?.color ?? "#55e9a9"}22`, color: rec.category?.color ?? "#55e9a9" }}
      >
        <Icon name={rec.category?.icon ?? "autorenew"} className="text-[20px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{rec.description || rec.category?.name || (rec.type === "INCOME" ? "Entrada fixa" : "Gasto fixo")}</p>
          {rec.type === "INCOME" && <span className="rounded bg-income/20 px-1.5 py-0.5 text-[10px] font-medium text-income">Entrada</span>}
        </div>
        <p className="text-xs text-on-surface-variant">
          Todo dia {rec.dayOfMonth} · {PAYMENT_LABELS[rec.paymentMethod]}
          {rec.category ? <> · <Chip name={rec.category.name} color={rec.category.color} /></> : null}
        </p>
        <p className={`mt-1 tabular font-semibold ${rec.type === "INCOME" ? "text-income" : "text-expense"}`}>
          {rec.type === "INCOME" ? "" : "- "}{formatCurrency(rec.amount)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Toggle on={rec.active} onClick={() => update.mutate({ id: rec.id, active: !rec.active })} />
        <div className="flex gap-1">
          <button onClick={onEdit} className="text-on-surface-variant hover:text-primary" title="Editar">
            <Icon name="edit" className="text-[18px]" />
          </button>
          <button onClick={handleDelete} className="text-on-surface-variant hover:text-error" title="Excluir">
            <Icon name="delete" className="text-[18px]" />
          </button>
        </div>
      </div>
    </Card>
  );
}

function RecurringForm({ editing, onClose }: { editing: RecurringExpense | null; onClose: () => void }) {
  const { data: categories } = useCategories();
  const create = useCreateRecurring();
  const update = useUpdateRecurring();
  const isEdit = !!editing;
  const now = new Date();

  const [type, setType] = useState<TransactionType>(editing?.type ?? "EXPENSE");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [dayOfMonth, setDayOfMonth] = useState(String(editing?.dayOfMonth ?? 5));
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editing?.paymentMethod ?? "DEBIT");
  const [error, setError] = useState<string | null>(null);

  const busy = create.isPending || update.isPending;

  async function handleSave() {
    setError(null);
    const value = Number(amount.replace(",", "."));
    const day = Number(dayOfMonth);
    if (!value || value <= 0) return setError("Informe um valor válido");
    if (!day || day < 1 || day > 31) return setError("Dia do mês deve ser entre 1 e 31");
    try {
      if (isEdit && editing) {
        await update.mutateAsync({
          id: editing.id,
          type,
          description: description.trim(),
          amount: value,
          dayOfMonth: day,
          categoryId: type === "EXPENSE" ? categoryId || null : null,
          paymentMethod,
        });
      } else {
        await create.mutateAsync({
          type,
          description: description.trim(),
          amount: value,
          dayOfMonth: day,
          categoryId: type === "EXPENSE" ? categoryId || null : null,
          paymentMethod,
          startYear: now.getFullYear(),
          startMonth: now.getMonth() + 1,
        });
      }
      onClose();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">{isEdit ? "Editar gasto fixo" : "Novo gasto fixo"}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface"><Icon name="close" /></button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setType("EXPENSE")}
            className={`rounded-lg border px-4 py-2.5 font-medium transition ${type === "EXPENSE" ? "border-expense bg-expense/20 text-expense" : "border-outline-variant/60"}`}
          >Gasto</button>
          <button
            onClick={() => setType("INCOME")}
            className={`rounded-lg border px-4 py-2.5 font-medium transition ${type === "INCOME" ? "border-primary bg-primary/20 text-primary" : "border-outline-variant/60"}`}
          >Entrada</button>
        </div>

        <div className="flex flex-col gap-3">
          {type === "EXPENSE" && (
            <label className="flex flex-col gap-1">
              <span className="text-sm text-on-surface-variant">Categoria</span>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-on-surface-variant">Valor (R$)</span>
              <input className="input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-on-surface-variant">Dia do mês</span>
              <input className="input" type="number" min="1" max="31" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
            </label>
          </div>
          {type === "EXPENSE" && (
            <label className="flex flex-col gap-1">
              <span className="text-sm text-on-surface-variant">Pagamento</span>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                {PAYMENTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-sm text-on-surface-variant">Observação <span className="text-xs opacity-70">(opcional)</span></span>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Aluguel do apê" />
          </label>
          {error && <p className="text-sm text-error">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}
