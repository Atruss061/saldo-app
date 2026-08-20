import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Icon } from "./Icon";
import { TransactionModalProvider, useTransactionModal } from "./NewTransactionModal";

function Shell() {
  const [navOpen, setNavOpen] = useState(false);
  const { open: onNewTransaction } = useTransactionModal();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={navOpen} onClose={() => setNavOpen(false)} />

      {/* Fundo escuro atrás do menu (só no celular) */}
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden
        />
      )}

      <main className="flex-1 overflow-x-hidden">
        {/* Barra superior — só no celular */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-outline-variant/40 bg-surface-container-lowest/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Abrir menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
          >
            <Icon name="menu" className="text-[24px]" />
          </button>
          <div className="flex items-center gap-2">
            <Icon name="diamond" filled className="text-[20px] text-primary" />
            <span className="font-display text-lg font-bold text-primary">Saldo</span>
          </div>
          <button
            onClick={() => onNewTransaction()}
            aria-label="Novo lançamento"
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-on-primary transition hover:brightness-105"
          >
            <Icon name="add" className="text-[22px]" />
          </button>
        </div>

        <div className="mx-auto max-w-container px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function AppLayout() {
  return (
    <TransactionModalProvider>
      <Shell />
    </TransactionModalProvider>
  );
}
