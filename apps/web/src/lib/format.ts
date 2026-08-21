// Formatação em português do Brasil, com moeda escolhida pelo usuário.
// A moeda é definida em runtime (após login) via setCurrency().

let currentCurrency = "BRL";

export const setCurrency = (code?: string | null) => {
  currentCurrency = code || "BRL";
};
export const getCurrency = () => currentCurrency;

const cache = new Map<string, Intl.NumberFormat>();
function fmt(currency: string, compact = false): Intl.NumberFormat {
  const key = `${currency}:${compact}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : {}),
    });
    cache.set(key, f);
  }
  return f;
}

export const formatCurrency = (value: number) => fmt(currentCurrency).format(value ?? 0);

export const formatCompactCurrency = (value: number) => fmt(currentCurrency, true).format(value ?? 0);

// Só o símbolo da moeda atual (ex.: "R$", "US$", "€") — para rótulos de campos.
export const currencySymbol = (code = currentCurrency) => {
  const part = new Intl.NumberFormat("pt-BR", { style: "currency", currency: code })
    .formatToParts(0)
    .find((p) => p.type === "currency");
  return part?.value ?? code;
};

export const formatPercent = (fraction: number) =>
  new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 }).format(fraction ?? 0);

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(iso)
  );

export const formatMonthYear = (year: number, month: number) => {
  const d = new Date(Date.UTC(year, month - 1, 1));
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
};
