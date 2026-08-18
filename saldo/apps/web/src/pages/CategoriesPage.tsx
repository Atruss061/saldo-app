import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, Spinner, ErrorBox, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useCategories, useCreateCategory, useDeleteCategory } from "@/lib/queries";

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
          <div className="grid grid-cols-3 gap-4">
            {data.map((c) => <CategoryCard key={c.id} category={c} />)}
          </div>
        )
      )}

      {showNew && <NewCategoryModal onClose={() => setShowNew(false)} />}
    </>
  );
}

function CategoryCard({ category }: { category: { id: string; name: string; description?: string | null; color: string; icon: string } }) {
  const del = useDeleteCategory();
  return (
    <Card className="flex items-start gap-3 !p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: `${category.color}22`, color: category.color }}>
        <Icon name={category.icon} className="text-[20px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{category.name}</p>
        {category.description && <p className="truncate text-xs text-on-surface-variant">{category.description}</p>}
      </div>
      <button onClick={() => del.mutate(category.id)} className="text-on-surface-variant hover:text-error" title="Excluir">
        <Icon name="delete" className="text-[18px]" />
      </button>
    </Card>
  );
}

function NewCategoryModal({ onClose }: { onClose: () => void }) {
  const create = useCreateCategory();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]!);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-md">
        <h2 className="mb-4 font-display text-2xl font-semibold">Nova categoria</h2>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1"><span className="text-sm text-on-surface-variant">Nome</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Pets" /></label>
          <div>
            <span className="mb-2 block text-sm text-on-surface-variant">Cor</span>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className={`h-8 w-8 rounded-full transition ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-surface-container" : ""}`} style={{ background: c }} />
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={create.isPending}
            onClick={async () => {
              setError(null);
              if (!name.trim()) return setError("Informe um nome");
              try {
                await create.mutateAsync({ name: name.trim(), color });
                onClose();
              } catch {
                setError("Não foi possível criar (nome já existe?)");
              }
            }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
