import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Spinner } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useCreateBankSession } from "@/lib/queries";

// Página de retorno do banco (Open Finance). O banco redireciona para cá com ?code=...
// Trocamos o code por uma sessão no backend e voltamos para /banco.
export function BankCallbackPage() {
  const navigate = useNavigate();
  const createSession = useCreateBankSession();
  const [failed, setFailed] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // evita rodar duas vezes (StrictMode)
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const bankError = params.get("error");

    if (bankError || !code) {
      navigate("/banco?erro=1", { replace: true });
      return;
    }

    createSession
      .mutateAsync(code)
      .then(() => navigate("/banco?ligado=1", { replace: true }))
      .catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="max-w-md text-center">
        {failed ? (
          <>
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-expense/15 text-expense">
              <Icon name="error" className="text-[24px]" />
            </span>
            <h2 className="mb-1 text-lg font-semibold">Não foi possível concluir</h2>
            <p className="mb-4 text-sm text-on-surface-variant">
              A ligação ao banco não foi concluída. Podes tentar novamente.
            </p>
            <button className="btn-primary" onClick={() => navigate("/banco", { replace: true })}>
              Voltar
            </button>
          </>
        ) : (
          <>
            <Spinner label="A ligar a tua conta…" />
            <p className="mt-2 text-sm text-on-surface-variant">A importar as tuas transações. Um instante.</p>
          </>
        )}
      </Card>
    </div>
  );
}
