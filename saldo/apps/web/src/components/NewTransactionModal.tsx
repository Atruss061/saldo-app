import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useCategories, useCreateTransaction } from "@/lib/queries";
import { Icon } from "./Icon";
import type { PaymentMethod, TransactionType } from "@/lib/types";

interface ModalCtx {
  open: () => void;
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
  const [isOpen, setOpen] = useState(false);
  const value = useMemo(() => ({ open: () => setOpen(true) }), []);
  return (
    <Ctx.Provider value={value}>
      {children}
      {isOpen && <Modal onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTransactionModal() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTransactionModal fora do provider");
  return ctx;
}

function Modal({ onClose }: { onClose: () => void }) {
  const { data: categories } = useCategories();
  const create = useCreateTransaction();

  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("DEBIT");
  const [installments, setInstallments] = useState("1");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const value = Number(amount.replace(",", "."));
    if (!description.trim()) return setError("Informe uma descrição");
    if (!value || value <= 0) return setError("Informe um valor válido");
    try {
      await create.mutateAsync({
        type,
        description: description.trim(),
        amount: value,
        date: new Date(date).toISOString(),
        categoryId: type === "EXPENSE" ? categoryId || null : null,
        paymentMethod,
        installments: paymentMethod === "CREDIT" ? Number(installments) || 1 : 1,
      });
      onClose();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Novo lançamento</h2>
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
          <label className="flex flex-col gap-1">
            <span className="text-sm text-on-surface-variant">Descrição</span>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Mercado da semana" />
          </label>
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
                <span className="text-sm text-on-surface-variant">Categoria</span>
                <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Sem categoria</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-on-surface-variant">Pagamento</span>
                <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                  {PAYMENTS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {type === "EXPENSE" && paymentMethod === "CREDIT" && (
            <label className="flex flex-col gap-1">
              <span className="text-sm text-on-surface-variant">Parcelas</span>
              <input className="input" type="number" min="1" value={installments} onChange={(e) => setInstallments(e.target.value)} />
            </label>
          )}

          {error && <p className="text-sm text-error">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave} disabled={create.isPending}>
            {create.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
