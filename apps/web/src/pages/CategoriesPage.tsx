import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, Spinner, ErrorBox, EmptyState, Modal } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from "@/lib/queries";
import { useConfirm } from "@/components/Confirm";
import type { Category } from "@/lib/types";

const PRESET_COLORS = ["#55e9a9", "#7c8cf8", "#f7c948", "#ff7a5c", "#b084ff", "#6ec6ff", "#ff6fb5", "#ffb3b2", "#5ac8fa", "#e5686b"];

export function CategoriesPage() {
  const { data, isLoading, isError } = useCategories();
  const [showNew, setShowNew] = useState(false);

  return (
    <>
      <PageHeader title="Categorias">
        <button className="btn-primary !py-2 !text-sm" onClick={() => setShowNew(true)}>+ Nova categoria</button>
      </PageHeader>

      {isLoading && <Spinner />}
      {isError && <ErrorBox />}
      {data && !isLoading && (
        data.length === 0 ? (
          <EmptyState icon="category" text="Nenhuma categoria ainda." action={<button className="btn-primary" onClick={() => setShowNew(true)}>+ Nova categoria</button>} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((c) => <CategoryCard key={c.id} category={c} />)}
          </div>
        )
      )}

      {showNew && <CategoryModal onClose={() => setShowNew(false)} />}
    </>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const del = useDeleteCategory();
  const confirm = useConfirm();
  const [editOpen, setEditOpen] = useState(false);

  async function handleDelete() {
    const ok = await confirm({
      title: "Excluir categoria?",
      message: `A categoria "${category.name}" será removida. Os lançamentos que a usam ficarão sem categoria.`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (ok) del.mutate(category.id);
  }

  return (
    <Card className="flex items-start gap-3 !p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: `${category.color}22`, color: category.color }}>
        <Icon name={category.icon} className="text-[20px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{category.name}</p>
        {category.description && <p className="truncate text-xs text-on-surface-variant">{category.description}</p>}
      </div>
      <button onClick={() => setEditOpen(true)} className="text-on-surface-variant hover:text-primary" title="Editar">
        <Icon name="edit" className="text-[18px]" />
      </button>
      <button onClick={handleDelete} className="text-on-surface-variant hover:text-error" title="Excluir">
        <Icon name="delete" className="text-[18px]" />
      </button>

      {editOpen && <CategoryModal category={category} onClose={() => setEditOpen(false)} />}
    </Card>
  );
}

// Modal de criar OU editar categoria (se receber `category`, entra em modo edição).
function CategoryModal({ category, onClose }: { category?: Category; onClose: () => void }) {
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? PRESET_COLORS[0]!);
  const [error, setError] = useState<string | null>(null);
  const busy = create.isPending || update.isPending;

  async function handleSave() {
    setError(null);
    if (!name.trim()) return setError("Informe um nome");
    try {
      if (isEdit) {
        await update.mutateAsync({ id: category!.id, name: name.trim(), color });
      } else {
        await create.mutateAsync({ name: name.trim(), color });
      }
      onClose();
    } catch {
      setError("Não foi possível salvar (nome já existe?)");
    }
  }

  return (
    <Modal onClose={onClose} onSubmit={handleSave} className="max-w-md">
        <h2 className="mb-4 font-display text-2xl font-semibold">{isEdit ? "Editar categoria" : "Nova categoria"}</h2>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1"><span className="text-sm text-on-surface-variant">Nome</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Pets" /></label>
          <div>
            <span className="mb-2 block text-sm text-on-surface-variant">Cor</span>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button type="button" key={c} onClick={() => setColor(c)} className={`h-8 w-8 rounded-full transition ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-surface-container" : ""}`} style={{ background: c }} />
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={busy}>Salvar</button>
        </div>
    </Modal>
  );
}
