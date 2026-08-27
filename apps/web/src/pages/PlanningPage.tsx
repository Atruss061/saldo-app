import { useState } from "react";
import { GoalsPage } from "./GoalsPage";
import { InvestmentsPage } from "./InvestmentsPage";

// Página combinada "Metas & Investimentos" com abas. Reaproveita as telas
// existentes por baixo — só coloca um seletor no topo pra alternar entre elas.
export function PlanningPage({ initial = "metas" }: { initial?: "metas" | "investimentos" }) {
  const [tab, setTab] = useState<"metas" | "investimentos">(initial);

  return (
    <>
      <div className="mb-6 inline-flex rounded-lg border border-outline-variant/50 bg-surface-container/40 p-1">
        <button
          onClick={() => setTab("metas")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            tab === "metas" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Metas
        </button>
        <button
          onClick={() => setTab("investimentos")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            tab === "investimentos" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Investimentos
        </button>
      </div>

      {tab === "metas" ? <GoalsPage /> : <InvestmentsPage />}
    </>
  );
}
