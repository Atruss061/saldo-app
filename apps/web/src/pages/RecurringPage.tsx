import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, Chip, Spinner, ErrorBox, EmptyState, Toggle, Modal } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useConfirm } from "@/components/Confirm";
import {
  useApplyRecurring,
  useCategories,
  useCreateRecurring,
  useDeleteRecurring,
  useRecurring,
  useUpdateRecurring,
  type RecurringEditScope,
} from "@/lib/queries";
import { formatCurrency, currencySymbol } from "@/lib/format";
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
  const [formType, setFormType] = useState<TransactionType>("EXPENSE");

  const openNew = (t: TransactionType) => { setEditing(null); setFormType(t); setShowForm(true); };
  const openEdit = (r: RecurringExpense) => { setEditing(r); setShowForm(true); };

  const generateThisMonth = () => {
    const now = new Date();
    apply.mutate({ year: now.getFullYear(), month: now.getMonth() + 1, force: true });
  };

  const entradas = (data ?? []).filter((r) => r.type === "INCOME");
  const gastos = (data ?? []).filter((r) => r.type === "EXPENSE");
  const totEntradas = entradas.reduce((s, r) => s + r.amount, 0);
  const totGastos = gastos.reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <PageHeader
        title="Carteira"
        help="Tudo que se repete todo mês: suas entradas fixas (salário, renda) e seus gastos fixos (aluguel, assinaturas…). Entram automaticamente na Visão Mensal de cada mês novo. Você pode editar ou remover a ocorrência de um mês específico sem afetar os outros."
      >
        <button className="btn-ghost !py-2 !text-sm" onClick={generateThisMonth} disabled={apply.isPending}>
          <Icon name="autorenew" className="text-[18px]" /> Gerar deste mês
        </button>
        <button className="btn-ghost !py-2 !text-sm !text-income hover:!bg-income/10" onClick={() => openNew("INCOME")}>
          <Icon name="add" className="text-[18px]" /> Entrada fixa
        </button>
        <button className="btn-primary !py-2 !text-sm" onClick={() => openNew("EXPENSE")}>
          <Icon name="add" className="text-[18px]" /> Gasto fixo
        </button>
      </PageHeader>

      {isLoading && <Spinner />}
      {isError && <ErrorBox />}
      {data && !isLoading && (
        data.length === 0 ? (
          <EmptyState
            icon="account_balance_wallet"
            text="Sua carteira está vazia. Cadastre suas entradas e gastos que se repetem todo mês."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <button className="btn-ghost !text-income hover:!bg-income/10" onClick={() => openNew("INCOME")}>+ Entrada fixa</button>
                <button className="btn-primary" onClick={() => openNew("EXPENSE")}>+ Gasto fixo</button>
              </div>
            }
          />
        ) : (
          <div className="flex flex-col gap-8">
            <RecurringSection
              title="Entradas fixas"
              icon="trending_up"
              tone="income"
              subtitle="O que entra todo mês (salário, renda…)"
              total={totEntradas}
              items={entradas}
              onAdd={() => openNew("INCOME")}
              onEdit={openEdit}
              addLabel="Entrada fixa"
            />
            <RecurringSection
              title="Gastos fixos"
              icon="trending_down"
              tone="expense"
              subtitle="O que sai todo mês (aluguel, assinaturas…)"
              total={totGastos}
              items={gastos}
              onAdd={() => openNew("EXPENSE")}
              onEdit={openEdit}
              addLabel="Gasto fixo"
            />
          </div>
        )
      )}

      {showForm && <RecurringForm editing={editing} initialType={formType} onClose={() => setShowForm(false)} />}
    </>
  );
}

function RecurringSection({
  title, icon, tone, subtitle, total, items, onAdd, onEdit, addLabel,
}: {
  title: string;
  icon: string;
  tone: "income" | "expense";
  subtitle: string;
  total: number;
  items: RecurringExpense[];
  onAdd: () => void;
  onEdit: (r: RecurringExpense) => void;
  addLabel: string;
}) {
  const toneText = tone === "income" ? "text-income" : "text-expense";
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/40 pb-2">
        <div className="flex items-center gap-2">
          <Icon name={icon} className={`text-[20px] ${toneText}`} />
          <h2 className="text-lg font-semibold">{title}</h2>
          <span className="hidden text-xs text-on-surface-variant sm:inline">· {subtitle}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-on-surface-variant">
            Total/mês: <span className={`tabular font-semibold ${toneText}`}>{formatCurrency(total)}</span>
          </span>
          <button className="btn-ghost !py-1.5 !text-sm" onClick={onAdd}>
            <Icon name="add" className="text-[16px]" /> {addLabel}
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <button
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant/50 py-6 text-sm text-on-surface-variant transition hover:border-primary/50 hover:text-on-surface"
        >
          <Icon name="add" className="text-[18px]" /> Adicionar {addLabel.toLowerCase()}
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((r) => <RecurringCard key={r.id} rec={r} onEdit={() => onEdit(r)} />)}
        </div>
      )}
    </section>
  );
}

function RecurringCard({ rec, onEdit }: { rec: RecurringExpense; onEdit: () => void }) {
  const del = useDeleteRecurring();
  const update = useUpdateRecurring();
  const confirm = useConfirm();

  async function handleDelete() {
    const ok = await confirm({
      title: "Excluir gasto fixo?",
      message: `Isso remove "${rec.description || rec.category?.name || "este fixo"}" e TODOS os lançamentos gerados por ele (em todos os meses). Não pode ser desfeito.`,
      confirmLabel: "Excluir tudo",
      danger: true,
    });
    if (ok) del.mutate(rec.id);
  }

  async function handleToggle() {
    if (rec.active) {
      const ok = await confirm({
        title: "Pausar este fixo?",
        message: `"${rec.description || rec.category?.name || "Este fixo"}" deixa de gerar novos meses. Os meses já lançados continuam como estão.`,
        confirmLabel: "Pausar",
      });
      if (!ok) return;
    }
    update.mutate({ id: rec.id, active: !rec.active });
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
          {rec.businessDay ? `${rec.dayOfMonth}º dia útil` : `Todo dia ${rec.dayOfMonth}`} · {PAYMENT_LABELS[rec.paymentMethod]}
          {rec.category ? <> · <Chip name={rec.category.name} color={rec.category.color} /></> : null}
        </p>
        <p className={`mt-1 tabular font-semibold ${rec.type === "INCOME" ? "text-income" : "text-expense"}`}>
          {rec.type === "INCOME" ? "" : "- "}{formatCurrency(rec.amount)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-medium ${rec.active ? "text-primary" : "text-on-surface-variant"}`}>
            {rec.active ? "Ativo" : "Pausado"}
          </span>
          <Toggle on={rec.active} onClick={handleToggle} />
        </div>
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

function RecurringForm({ editing, initialType = "EXPENSE", onClose }: { editing: RecurringExpense | null; initialType?: TransactionType; onClose: () => void }) {
  const { data: categories } = useCategories();
  const create = useCreateRecurring();
  const update = useUpdateRecurring();
  const isEdit = !!editing;
  const now = new Date();

  const [type, setType] = useState<TransactionType>(editing?.type ?? initialType);
  const [description, setDescription] = useState(editing?.description ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [dayOfMonth, setDayOfMonth] = useState(String(editing?.dayOfMonth ?? 5));
  const [businessDay, setBusinessDay] = useState(editing?.businessDay ?? false);
  // Alcance da edição: "this" (só este mês) ou "from" (a partir do mês escolhido).
  const [applyMode, setApplyMode] = useState<"this" | "from">("from");
  const [fromMonth, setFromMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  // Ao CRIAR: mês a partir do qual o fixo passa a valer (preenche até dezembro).
  const [createFrom, setCreateFrom] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editing?.paymentMethod ?? "DEBIT");
  const [error, setError] = useState<string | null>(null);

  const busy = create.isPending || update.isPending;

  async function handleSave() {
    setError(null);
    const value = Number(amount.replace(",", "."));
    const day = Number(dayOfMonth);
    const maxDay = businessDay ? 23 : 31;
    if (!value || value <= 0) return setError("Informe um valor válido");
    if (!day || day < 1 || day > maxDay)
      return setError(businessDay ? "Dia útil deve ser entre 1 e 23" : "Dia do mês deve ser entre 1 e 31");
    try {
      if (isEdit && editing) {
        // "this" = exceção pontual; "from" = vale a partir do mês escolhido.
        const scope: RecurringEditScope = applyMode === "this" ? "this" : "future";
        const [fy, fm] = fromMonth.split("-").map(Number);
        const anchorYear = applyMode === "this" ? now.getFullYear() : fy!;
        const anchorMonth = applyMode === "this" ? now.getMonth() + 1 : fm!;
        await update.mutateAsync({
          id: editing.id,
          type,
          description: description.trim(),
          amount: value,
          dayOfMonth: day,
          businessDay,
          categoryId: type === "EXPENSE" ? categoryId || null : null,
          paymentMethod,
          scope,
          anchorYear,
          anchorMonth,
        });
      } else {
        const [cy, cm] = createFrom.split("-").map(Number);
        await create.mutateAsync({
          type,
          description: description.trim(),
          amount: value,
          dayOfMonth: day,
          businessDay,
          categoryId: type === "EXPENSE" ? categoryId || null : null,
          paymentMethod,
          startYear: cy!,
          startMonth: cm!,
        });
      }
      onClose();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    }
  }

  return (
    <Modal onClose={onClose} onSubmit={handleSave} className="max-w-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">
            {isEdit
              ? (type === "INCOME" ? "Editar entrada fixa" : "Editar gasto fixo")
              : (type === "INCOME" ? "Nova entrada fixa" : "Novo gasto fixo")}
          </h2>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface"><Icon name="close" /></button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setType("EXPENSE"); setBusinessDay(false); }}
            className={`rounded-lg border px-4 py-2.5 font-medium transition ${type === "EXPENSE" ? "border-expense bg-expense/20 text-expense" : "border-outline-variant/60"}`}
          >Gasto</button>
          <button
            type="button"
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
              <span className="text-sm text-on-surface-variant">Valor ({currencySymbol()})</span>
              <input className="input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-on-surface-variant">{businessDay ? "Nº dia útil" : "Dia do mês"}</span>
              <input className="input" type="number" min="1" max={businessDay ? 23 : 31} value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
            </label>
          </div>
          {/* "Dia útil" só faz sentido para entradas (salário); gasto usa dia fixo do mês. */}
          {type === "INCOME" && (
            <label className="flex flex-col gap-1">
              <span className="text-sm text-on-surface-variant">Quando ocorre</span>
              <select
                className="input"
                value={businessDay ? "business" : "fixed"}
                onChange={(e) => setBusinessDay(e.target.value === "business")}
              >
                <option value="fixed">Dia fixo do mês (ex.: todo dia 5)</option>
                <option value="business">Dia útil (ex.: 5º dia útil — ideal p/ salário)</option>
              </select>
            </label>
          )}
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
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Renda de casa" />
          </label>

          {/* Ao criar: mês inicial. Preenche do mês escolhido até dezembro. */}
          {!isEdit && (
            <label className="flex flex-col gap-1 rounded-lg border border-outline-variant/50 p-3">
              <span className="text-sm font-medium text-on-surface">Válido a partir de</span>
              <input
                type="month"
                className="input mt-1"
                value={createFrom}
                onChange={(e) => setCreateFrom(e.target.value)}
              />
              <span className="mt-1 text-xs text-on-surface-variant">
                Preenche do mês escolhido até dezembro. Deixe no mês atual se começa agora; escolha janeiro para valer o ano todo.
              </span>
            </label>
          )}

          {isEdit && (
            <div className="rounded-lg border border-outline-variant/50 p-3">
              <span className="mb-2 block text-sm font-medium text-on-surface">Aplicar esta alteração em:</span>
              <div className="flex flex-col gap-1.5">
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="applyMode"
                    className="mt-1 accent-primary"
                    checked={applyMode === "from"}
                    onChange={() => setApplyMode("from")}
                  />
                  <span className="flex-1">
                    <span className="font-medium text-on-surface">A partir de um mês</span>
                    <span className="block text-xs text-on-surface-variant">
                      Vale desse mês pra frente; os meses anteriores mantêm o valor antigo.
                    </span>
                    {applyMode === "from" && (
                      <input
                        type="month"
                        className="input mt-2"
                        value={fromMonth}
                        onChange={(e) => setFromMonth(e.target.value)}
                      />
                    )}
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="applyMode"
                    className="mt-1 accent-primary"
                    checked={applyMode === "this"}
                    onChange={() => setApplyMode("this")}
                  />
                  <span>
                    <span className="font-medium text-on-surface">Somente este mês</span>
                    <span className="block text-xs text-on-surface-variant">Ajuste pontual, sem mexer nos outros meses.</span>
                  </span>
                </label>
              </div>
              <p className="mt-2 text-xs text-on-surface-variant">
                Para valer em <b>todos</b> os meses, escolha o primeiro mês do gasto. Meses já pagos e ajustes feitos à mão são preservados.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-error">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button>
        </div>
    </Modal>
  );
}
