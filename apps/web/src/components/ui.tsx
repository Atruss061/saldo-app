import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { formatCurrency } from "@/lib/format";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`card ${className}`}>{children}</div>;
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
