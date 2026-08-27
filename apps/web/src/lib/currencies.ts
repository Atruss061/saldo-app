import { currencySymbol } from "./format";

// Moedas suportadas (precisa bater com o enum do backend).
export const CURRENCIES: { code: string; name: string }[] = [
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "Libra esterlina" },
  { code: "USD", name: "Dólar americano" },
  { code: "BRL", name: "Real brasileiro" },
  { code: "CHF", name: "Franco suíço" },
  { code: "CAD", name: "Dólar canadiano" },
  { code: "AUD", name: "Dólar australiano" },
  { code: "JPY", name: "Iene japonês" },
];

export const currencyLabel = (code: string) => {
  const c = CURRENCIES.find((x) => x.code === code);
  return c ? `${currencySymbol(code)} — ${c.name} (${code})` : code;
};
