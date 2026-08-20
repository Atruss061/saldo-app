import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { formatCurrency } from "@/lib/format";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`card ${className}`}>{children}</div>;
}

// Janela modal com suporte a teclado:
//  - Esc fecha
//  - clicar no fundo fecha
//  - foco automático no primeiro campo ao abrir
//  - se receber onSubmit, envolve tudo num <form> → Enter salva
// (o botão principal deve ser type="submit"; os demais, type="button")
export function Modal({
  onClose,
  onSubmit,
  className = "max-w-md",
  z = "z-40",
  children,
}: {
  onClose: () => void;
  onSubmit?: () => void;
  className?: string;
  z?: string;
  children: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    // foca o primeiro campo editável da janela
    const el = cardRef.current?.querySelector<HTMLElement>("input, select, textarea");
    el?.focus();
  }, []);

  const card = (
    <div ref={cardRef} className={`card w-full ${className}`} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );

  return (
    <div
      className={`fixed inset-0 ${z} flex items-center justify-center bg-black/60 p-4`}
      onClick={onClose}
    >
      {onSubmit ? (
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {card}
        </form>
      ) : (
        card
      )}
    </div>
  );
}

export function Kpi({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: number;
  icon: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "ring-1 ring-primary/50" : ""}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
          <Icon name={icon} className="text-[18px]" />
        </span>
      </div>
      <p className={`font-display text-3xl font-bold tabular ${accent ? "text-primary" : "text-on-surface"}`}>
        {formatCurrency(value)}
      </p>
    </Card>
  );
}

export function Chip({ name, color }: { name: string; color: string }) {
  return (
    <span className="chip" style={{ background: `${color}22`, color }}>
      {name}
    </span>
  );
}

export function ProgressBar({
  value,
  color,
  height = "h-2",
}: {
  value: number; // 0..1
  color: string;
  height?: string;
}) {
  return (
    <div className={`${height} w-full overflow-hidden rounded-full bg-surface-container-highest`}>
      <div className={`${height} rounded-full`} style={{ width: `${Math.min(value * 100, 100)}%`, background: color }} />
    </div>
  );
}

export function Toggle({ on, onClick }: { on: boolean; onClick?: () => void }) {
  const cls = `inline-flex h-5 w-9 items-center rounded-full p-0.5 transition ${
    on ? "justify-end bg-primary" : "justify-start bg-surface-container-highest"
  }`;
  const dot = <span className="h-4 w-4 rounded-full bg-white" />;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} cursor-pointer`} aria-pressed={on}>
        {dot}
      </button>
    );
  }
  return <span className={cls}>{dot}</span>;
}

export function EmptyState({ icon, text, action }: { icon: string; text: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
        <Icon name={icon} className="text-[28px]" />
      </div>
      <p className="max-w-sm text-on-surface-variant">{text}</p>
      {action}
    </div>
  );
}

export function Spinner({ label = "Carregando…" }: { label?: string }) {
  return <div className="card py-16 text-center text-on-surface-variant">{label}</div>;
}

export function ErrorBox({ text = "Não foi possível carregar os dados." }: { text?: string }) {
  return <div className="card py-16 text-center text-error">{text}</div>;
}
