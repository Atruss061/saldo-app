import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { PasswordInput } from "./PasswordInput";
import { Modal } from "./ui";
import { Icon } from "./Icon";

export function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const { deleteAccount } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setError(null);
    if (!password) return setError("Digite sua senha para confirmar");
    setLoading(true);
    try {
      await deleteAccount(password);
      // Ao excluir, o usuário é deslogado → o app redireciona para o login sozinho.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível excluir a conta");
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} onSubmit={handleDelete} className="max-w-md" z="z-50">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-expense/15 text-expense">
            <Icon name="warning" className="text-[22px]" />
          </span>
          <h2 className="font-display text-xl font-semibold">Excluir minha conta</h2>
        </div>

        <p className="mb-4 text-sm text-on-surface-variant">
          Isso apaga <b>permanentemente</b> sua conta e <b>todos os dados</b> (lançamentos, categorias,
          metas e investimentos). Essa ação <b>não pode ser desfeita</b>. Para confirmar, digite sua senha:
        </p>

        <PasswordInput value={password} onChange={setPassword} placeholder="Sua senha" />
        {error && <p className="mt-2 text-sm text-error">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn bg-expense text-white" disabled={loading}>
            {loading ? "Excluindo…" : "Excluir conta"}
          </button>
        </div>
    </Modal>
  );
}
