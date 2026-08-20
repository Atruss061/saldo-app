import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "./Icon";

// Aviso para quem já tinha conta (antes do passo a passo existir) ou ainda não
// concluiu a configuração inicial. Some ao concluir ("saldo_onboarded_<id>")
// ou ao dispensar ("saldo_onboard_dismissed_<id>").
export function OnboardingBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const doneKey = `saldo_onboarded_${user?.id}`;
  const dismissKey = `saldo_onboard_dismissed_${user?.id}`;

  const [hidden, setHidden] = useState(() => {
    try {
      return !user || localStorage.getItem(doneKey) === "1" || localStorage.getItem(dismissKey) === "1";
    } catch {
      return true;
    }
  });

  if (hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {
      /* ignora */
    }
    setHidden(true);
  };

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon name="auto_awesome" className="text-[22px]" />
      </span>
      <div className="flex-1">
        <p className="font-semibold text-on-surface">Configure em 1 minuto</p>
        <p className="text-sm text-on-surface-variant">
          Cadastre seu salário, gastos fixos e metas de uma vez, sem precisar digitar tudo na mão.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button className="btn-ghost !py-2 !text-sm" onClick={dismiss}>
          Agora não
        </button>
        <button className="btn-primary !py-2 !text-sm" onClick={() => navigate("/bem-vindo")}>
          Fazer agora
        </button>
      </div>
    </div>
  );
}
