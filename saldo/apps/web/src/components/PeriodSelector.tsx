import { Icon } from "./Icon";

export function PeriodSelector({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-container px-1 py-1">
      <button onClick={onPrev} className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface">
        <Icon name="chevron_left" className="text-[20px]" />
      </button>
      <span className="min-w-[130px] text-center text-sm font-medium capitalize">{label}</span>
      <button onClick={onNext} className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface">
        <Icon name="chevron_right" className="text-[20px]" />
      </button>
    </div>
  );
}
