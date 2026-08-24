import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { formatCurrency } from "@/lib/format";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`card ${className}`}>{children}</div>;
}

// Ícone "?" que mostra uma explicação quando o cursor passa por cima (ou com foco).
export function HelpTip({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`group relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        aria-label="Ajuda"
        className="flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant transition hover:text-on-surface"
      >
        <Icon name="help" className="text-[16px]" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-72 rounded-lg border border-outline-variant/50 bg-surface-container-high p-3 text-left text-xs font-normal leading-relaxed text-on-surface-variant opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
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
    <div ref={cardRef} className={`card my-auto w-full ${className}`} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );

  // overlay rola quando o conteúdo é mais alto que a tela (importante no celular)
  return (
    <div
      className={`fixed inset-0 ${z} overflow-y-auto bg-black/60 p-4`}
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center">
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
    </div>
  );
}

// tone define a cor do número seguindo a lógica de mercado:
//  income = verde (entra) · expense = vermelho (sai) · invest = azul
//  balance = verde se ≥ 0, vermelho se < 0 · neutral = padrão
export type KpiTone = "income" | "expense" | "invest" | "balance" | "neutral";

export function Kpi({
  label,
  value,
  icon,
  accent = false,
  tone = "neutral",
}: {
  label: string;
  value: number;
  icon: string;
  accent?: boolean;
  tone?: KpiTone;
}) {
  const resolved: Exclude<KpiTone, "balance"> =
    tone === "balance" ? (value < 0 ? "expense" : "income") : tone;

  const numClass =
    resolved === "income"
      ? "text-income"
      : resolved === "expense"
      ? "text-expense"
      : resolved === "invest"
      ? "text-invest"
      : "text-on-surface";

  const iconClass =
    resolved === "income"
      ? "bg-income/15 text-income"
      : resolved === "expense"
      ? "bg-expense/15 text-expense"
      : resolved === "invest"
      ? "bg-invest/15 text-invest"
      : "bg-surface-container-high text-on-surface-variant";

  return (
    <Card className={accent ? "ring-1 ring-primary/50" : ""}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${iconClass}`}>
          <Icon name={icon} className="text-[18px]" />
        </span>
      </div>
      <p className={`font-display text-3xl font-bold tabular ${numClass}`}>{formatCurrency(value)}</p>
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
  const track = `relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
    on ? "bg-primary" : "bg-surface-container-highest"
  }`;
  const dot = `absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-out ${
    on ? "translate-x-4" : "translate-x-0"
  }`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${track} cursor-pointer`} aria-pressed={on}>
        <span className={dot} />
      </button>
    );
  }
  return (
    <span className={track}>
      <span className={dot} />
    </span>
  );
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
