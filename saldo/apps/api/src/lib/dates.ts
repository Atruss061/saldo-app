// Intervalo [início, fim) de um mês, em UTC, para filtros de data no Prisma.
export function monthRange(year: number, month: number): { gte: Date; lt: Date } {
  const gte = new Date(Date.UTC(year, month - 1, 1));
  const lt = new Date(Date.UTC(year, month, 1)); // primeiro dia do mês seguinte
  return { gte, lt };
}

// Intervalo [início, fim) de um ano inteiro, em UTC.
export function yearRange(year: number): { gte: Date; lt: Date } {
  return { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };
}

// Mês (1-12) de uma data, em UTC.
export const monthOf = (d: Date) => d.getUTCMonth() + 1;
