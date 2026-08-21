import { currencySymbol } from "./format";

// Moedas suportadas (precisa bater com o enum do backend).
export const CURRENCIES: { code: string; name: string }[] = [
  { code: "BRL", name: "Real brasileiro" },
  { code: "USD", name: "Dólar americano" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "Libra esterlina" },
  { code: "JPY", name: "Iene japonês" },
  { code: "CAD", name: "Dólar canadense" },
  { code: "AUD", name: "Dólar australiano" },
  { code: "CHF", name: "Franco suíço" },
  { code: "ARS", name: "Peso argentino" },
  { code: "MXN", name: "Peso mexicano" },
];

export const currencyLabel = (code: string) => {
  const c = CURRENCIES.find((x) => x.code === code);
  return c ? `${currencySymbol(code)} — ${c.name} (${code})` : code;
};
