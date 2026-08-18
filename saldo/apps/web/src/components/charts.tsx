import { formatCurrency, formatPercent } from "@/lib/format";

interface MonthPoint {
  name: string;
  income: number;
  expense: number;
  balance: number;
}

// Barras agrupadas: entradas vs gastos por mês.
export function BarChart({ data }: { data: MonthPoint[] }) {
  const W = 640, H = 240, pad = 28, n = data.length || 1;
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense])) * 1.1;
  const gw = (W - pad * 2) / n;
  const bw = Math.min(9, gw / 3);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {data.map((d, i) => {
        const x = pad + i * gw + gw / 2;
        const hi = (d.income / max) * (H - pad * 2);
        const he = (d.expense / max) * (H - pad * 2);
        return (
          <g key={i}>
            <rect x={x - bw - 1.5} y={H - pad - hi} width={bw} height={hi} rx={3} fill="#55e9a9">
              <title>{`${d.name} · Entradas: ${formatCurrency(d.income)}`}</title>
            </rect>
            <rect x={x + 1.5} y={H - pad - he} width={bw} height={he} rx={3} fill="#e5686b">
              <title>{`${d.name} · Gastos: ${formatCurrency(d.expense)}`}</title>
            </rect>
            <text x={x} y={H - pad + 16} fill="#bbcabf" fontSize={10} textAnchor="middle">
              {d.name.slice(0, 3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Área: evolução do saldo.
export function AreaChart({ data }: { data: MonthPoint[] }) {
  const W = 640, H = 240, pad = 28, n = data.length || 1;
  const vals = data.map((d) => d.balance);
  const max = Math.max(1, ...vals) * 1.15;
  const min = Math.min(0, ...vals);
  const X = (i: number) => pad + i * ((W - pad * 2) / Math.max(1, n - 1));
  const Y = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
  const first = vals[0] ?? 0;
  let line = `M${X(0)},${Y(first)}`;
  vals.forEach((v, i) => { if (i) line += ` L${X(i)},${Y(v)}`; });
  const area = `${line} L${X(n - 1)},${H - pad} L${X(0)},${H - pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#55e9a9" stopOpacity="0.35" />
          <stop offset="1" stopColor="#55e9a9" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke="#55e9a9" strokeWidth={2} />
      {vals.map((v, i) => (
        <circle key={i} cx={X(i)} cy={Y(v)} r={4} fill="#55e9a9" stroke="#111319" strokeWidth={2}>
          <title>{`${data[i]?.name}: ${formatCurrency(v)}`}</title>
        </circle>
      ))}
      {data.map((d, i) =>
        i % 2 === 0 ? (
          <text key={i} x={X(i)} y={H - 8} fill="#bbcabf" fontSize={10} textAnchor="middle">
            {d.name.slice(0, 3)}
          </text>
        ) : null
      )}
    </svg>
  );
}

export interface DonutItem {
  name: string;
  value: number;
  color: string;
}

export function Donut({ items }: { items: DonutItem[] }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const R = 70, r = 44, C = 90;
  let a = -Math.PI / 2;
  const segs = items.map((it, idx) => {
    const frac = it.value / total;
    const a2 = a + frac * Math.PI * 2;
    const x1 = C + R * Math.cos(a), y1 = C + R * Math.sin(a);
    const x2 = C + R * Math.cos(a2), y2 = C + R * Math.sin(a2);
    const xi2 = C + r * Math.cos(a2), yi2 = C + r * Math.sin(a2);
    const xi1 = C + r * Math.cos(a), yi1 = C + r * Math.sin(a);
    const large = frac > 0.5 ? 1 : 0;
    const d = `M${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${large} 0 ${xi1},${yi1} Z`;
    a = a2;
    return (
      <path key={idx} d={d} fill={it.color} stroke="#1d2025" strokeWidth={2}>
        <title>{`${it.name}: ${formatCurrency(it.value)} · ${formatPercent(frac)}`}</title>
      </path>
    );
  });
  return (
    <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0">
      {segs}
      <text x="90" y="86" fill="#bbcabf" fontSize={10} textAnchor="middle">Total</text>
      <text x="90" y="104" fill="#e1e2e9" fontSize={14} fontWeight={700} textAnchor="middle" fontFamily="Space Grotesk">
        {formatCurrency(total)}
      </text>
    </svg>
  );
}

export interface StackPoint {
  label: string;
  parts: { value: number; color: string; name: string }[];
}

export function StackChart({ data }: { data: StackPoint[] }) {
  const W = 640, H = 220, pad = 28, n = data.length || 1;
  const max = Math.max(1, ...data.map((d) => d.parts.reduce((s, p) => s + p.value, 0))) * 1.1;
  const gw = (W - pad * 2) / n;
  const bw = Math.min(34, gw * 0.5);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {data.map((d, i) => {
        const x = pad + i * gw + gw / 2 - bw / 2;
        let y = H - pad;
        return (
          <g key={i}>
            {d.parts.map((p, j) => {
              const h = (p.value / max) * (H - pad * 2);
              y -= h;
              return (
                <rect key={j} x={x} y={y} width={bw} height={Math.max(h - 2, 0)} rx={3} fill={p.color}>
                  <title>{`${d.label} · ${p.name}: ${formatCurrency(p.value)}`}</title>
                </rect>
              );
            })}
            <text x={x + bw / 2} y={H - pad + 16} fill="#bbcabf" fontSize={10} textAnchor="middle">
              {d.label.slice(0, 3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
