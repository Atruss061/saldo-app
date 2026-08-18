// Estrutura mínima de um Decimal do Prisma (evita acoplar ao namespace gerado).
type DecimalLike = { toNumber(): number };

function isDecimalLike(v: unknown): v is DecimalLike {
  return typeof v === "object" && v !== null && typeof (v as DecimalLike).toNumber === "function";
}

// Converte Decimal do Prisma em number para o JSON de resposta.
// (Valores monetários do app cabem com folga na precisão de number.)
export function decToNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (isDecimalLike(value)) return value.toNumber();
  return Number(value);
}

// Aplica decToNumber a um conjunto de campos de um objeto, retornando uma cópia.
export function serializeMoney<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const out = { ...obj };
  for (const f of fields) {
    out[f] = decToNumber(out[f]) as T[keyof T];
  }
  return out;
}
