import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  useCategories,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from "@/lib/queries";
import { useConfirm } from "./Confirm";
import { Icon } from "./Icon";
import type { PaymentMethod, Transaction, TransactionType } from "@/lib/types";

interface ModalCtx {
  open: (tx?: Transaction) => void;
}
const Ctx = createContext<ModalCtx | null>(null);

const PAYMENTS: { value: PaymentMethod; label: string }[] = [
  { value: "DEBIT", label: "Débito" },
  { value: "CREDIT", label: "Cartão de crédito" },
  { value: "PIX", label: "Pix" },
  { value: "AUTO_DEBIT", label: "Débito automático" },
  { value: "TRANSFER", label: "Transferência" },
  { value: "CASH", label: "Dinheiro" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionModalProvider({ children }: { children: ReactNode }) {
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [isOpen, setOpen] = useState(false);
  const value = useMemo(
    () => ({
      open: (tx?: Transaction) => {
        setEditing(tx ?? null);
        setOpen(true);
      },
    }),
    []
  );
  return (
    <Ctx.Provider value={value}>
      {children}
      {isOpen && <Modal editing={editing} onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTransactionModal() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTransactionModal fora do provider");
  return ctx;
}

function Modal({ editing, onClose }: { editing: Transaction | null; onClose: () => void }) {
  const { data: categories } = useCategories();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const confirm = useConfirm();
  const isEdit = !!editing;

  const [type, setType] = useState<TransactionType>(editing?.type ?? "EXPENSE");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [date, setDate] = useState(editing ? editing.date.slice(0, 10) : todayISO());
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editing?.paymentMethod ?? "DEBIT");
  const [installments, setInstallments] = useState(editing ? String(editing.installments) : "1");
  const [isPaid, setIsPaid] = useState(editing?.isPaid ?? true);
  const [error, setError] = useState<string | null>(null);

  const busy = create.isPending || update.isPending || remove.isPending;

  async function handleSave() {
    setError(null);
    const value = Number(amount.replace(",", "."));
    if (!value || value <= 0) return setError("Informe um valor válido");
    const payload = {
      type,
      description: description.trim(),
      amount: value,
      date: new Date(date).toISOString(),
      categoryId: type === "EXPENSE" ? categoryId || null : null,
      paymentMethod,
      installments: paymentMethod === "CREDIT" ? Number(installments) || 1 : 1,
      isPaid,
    };
    try {
      if (isEdit && editing) await update.mutateAsync({ id: editing.id, ...payload });
      else await create.mutateAsync(payload);
      onClose();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    }
  }

  async function handleDelete() {
    if (!editing) return;
    const ok = await confirm({
      title: "Excluir lançamento?",
      message: `"${editing.description}" será removido permanentemente.`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(editing.id);
      onClose();
    } catch {
      setError("Não foi possível excluir. Tente novamente.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">
            {isEdit ? "Editar lançamento" : "Novo lançamento"}
          </h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <Icon name="close" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setType("EXPENSE")}
            className={`rounded-lg border px-4 py-2.5 font-medium transition ${
              type === "EXPENSE" ? "border-expense bg-expense/20 text-expense" : "border-outline-variant/60"
            }`}
          >
            Gasto
          </button>
          <button
            onClick={() => setType("INCOME")}
            className={`rounded-lg border px-4 py-2.5 font-medium transition ${
              type === "INCOME" ? "border-primary bg-primary/20 text-primary" : "border-outline-variant/60"
            }`}
          >
            Entrada
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {type === "EXPENSE" && (
            <label className="flex flex-col gap-1">
              <span className="text-sm text-on-surface-variant">Categoria</span>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-on-surface-variant">Valor (R$)</span>
              <input className="input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-on-surface-variant">Data</span>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
          {type === "EXPENSE" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-on-surface-variant">Pagamento</span>
                <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                  {PAYMENTS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </label>
              {paymentMethod === "CREDIT" ? (
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-on-surface-variant">Parcelas</span>
                  <input className="input" type="number" min="1" value={installments} onChange={(e) => setInstallments(e.target.value)} />
                </label>
              ) : (
                <label className="flex cursor-pointer items-end gap-2 pb-2.5 text-sm">
                  <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="h-4 w-4 accent-primary" />
                  <span className="text-on-surface-variant">Já foi pago</span>
                </label>
              )}
            </div>
          )}
          {(type === "INCOME" || paymentMethod === "CREDIT") && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="h-4 w-4 accent-primary" />
              <span className="text-on-surface-variant">{type === "INCOME" ? "Já recebido" : "Já foi pago"}</span>
            </label>
          )}

          {/* Observação (opcional) — fica por último, é só um complemento */}
          <label className="flex flex-col gap-1">
            <span className="text-sm text-on-surface-variant">Observação <span className="text-xs opacity-70">(opcional)</span></span>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === "INCOME" ? "Ex.: Salário de agosto" : "Ex.: mercado da semana"}
            />
          </label>

          {error && <p className="text-sm text-error">{error}</p>}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {isEdit ? (
            <button className="btn-ghost !text-expense hover:!bg-expense/10" onClick={handleDelete} disabled={busy}>
              <Icon name="delete" className="text-[18px]" /> Excluir
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={busy}>
              {busy ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
