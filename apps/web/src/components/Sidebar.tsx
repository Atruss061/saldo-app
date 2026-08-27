import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactionModal } from "./NewTransactionModal";
import { DeleteAccountModal } from "./DeleteAccountModal";

const NAV = [
  { to: "/", label: "Início", icon: "dashboard", end: true },
  { to: "/mes", label: "Mês", icon: "calendar_month" },
  { to: "/fixos", label: "Carteira", icon: "wallet" },
  { to: "/metas", label: "Metas & Investimentos", icon: "target" },
  { to: "/configuracoes", label: "Configurações", icon: "settings" },
];

export function Sidebar({
  mobileOpen = false,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const { user, logout } = useAuth();
  const { open: onNewTransaction } = useTransactionModal();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside
      className={`fixed top-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-outline-variant/40 bg-surface-container-lowest p-4 transition-transform duration-200 will-change-transform md:sticky md:z-auto md:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Marca */}
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon name="diamond" filled className="text-[22px]" />
        </div>
        <div>
          <p className="font-display text-xl font-bold text-primary leading-none">Saldo</p>
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Premium Finance</p>
        </div>
        {/* Fechar (só no celular) */}
        <button
          onClick={onClose}
          aria-label="Fechar menu"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface md:hidden"
        >
          <Icon name="close" className="text-[22px]" />
        </button>
      </div>

      {/* CTA */}
      <button
        onClick={() => { onNewTransaction(); onClose?.(); }}
        className="mb-6 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary transition hover:brightness-105"
      >
        <Icon name="add" className="text-[20px]" />
        Novo lançamento
      </button>

      {/* Navegação */}
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`
            }
          >
            <Icon name={item.icon} className="text-[20px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Usuário / sair */}
      <div className="mt-auto border-t border-outline-variant/40 pt-4">
        {user && (
          <div className="mb-2 flex items-center gap-2 px-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-on-surface">{user.name}</p>
              <p className="truncate text-xs text-on-surface-variant">{user.email}</p>
            </div>
            {/* Menu discreto (⋯) com ações da conta */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                title="Opções da conta"
                aria-label="Opções da conta"
              >
                <Icon name="more_vert" className="text-[20px]" />
              </button>
              {menuOpen && (
                <>
                  {/* clique fora fecha o menu */}
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute bottom-10 right-0 z-20 w-52 overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-high shadow-lg">
                    <button
                      onClick={() => { setMenuOpen(false); onClose?.(); navigate("/bem-vindo"); }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                    >
                      <Icon name="auto_awesome" className="text-[18px]" />
                      Refazer configuração
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-on-surface-variant transition hover:bg-expense/10 hover:text-expense"
                    >
                      <Icon name="delete" className="text-[18px]" />
                      Excluir conta
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        <button
          onClick={() => void logout()}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
        >
          <Icon name="logout" className="text-[20px]" />
          Sair
        </button>
      </div>

      {deleteOpen && <DeleteAccountModal onClose={() => setDeleteOpen(false)} />}
    </aside>
  );
}
