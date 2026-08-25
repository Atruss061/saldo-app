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

// Soma meses a uma data (UTC), mantendo o dia (ajustado ao último dia do mês se preciso).
export function addMonthsUTC(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m + months, Math.min(d, lastDay)));
}

// Retorna o dia do mês (1-31) correspondente ao N-ésimo dia útil (seg–sex).
// Ignora feriados. Se N ultrapassar o total de dias úteis, usa o último dia útil.
export function nthBusinessDayOfMonth(year: number, month: number, n: number): number {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let count = 0;
  let lastBusiness = 1;
  for (let day = 1; day <= lastDay; day++) {
    const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0=dom, 6=sáb
    if (dow !== 0 && dow !== 6) {
      count++;
      lastBusiness = day;
      if (count >= n) return day;
    }
  }
  return lastBusiness;
}
