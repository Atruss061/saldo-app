import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { userId } from "../../lib/http.js";
import { decToNumber } from "../../lib/serialize.js";
import { monthRange, yearRange } from "../../lib/dates.js";

const annualQuery = z.object({ year: z.coerce.number().int().min(2000).max(2100) });
const monthlyQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Linha crua do agrupamento por mês/tipo (Postgres).
interface MonthTypeRow {
  month: number;
  type: "INCOME" | "EXPENSE";
  total: number | string | null;
}

export async function reportsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // ── Panorama anual: entradas/gastos/saldo por mês + totais ──
  app.get("/reports/annual", async (req) => {
    const uid = userId(req);
    const { year } = annualQuery.parse(req.query);
    const { gte, lt } = yearRange(year);

    // Agregação por mês e tipo, direto no banco.
    const rows = await prisma.$queryRaw<MonthTypeRow[]>`
      SELECT EXTRACT(MONTH FROM date)::int AS month, type, SUM(amount) AS total
      FROM transactions
      WHERE "userId" = ${uid} AND date >= ${gte} AND date < ${lt}
      GROUP BY month, type
    `;

    const invAgg = await prisma.investment.aggregate({
      where: { userId: uid, date: { gte, lt } },
      _sum: { amount: true },
    });

    // Monta os 12 meses (mesmo os sem lançamento).
    const months = MONTH_NAMES.map((name, i) => {
      const m = i + 1;
      const income = rows.find((r) => r.month === m && r.type === "INCOME");
      const expense = rows.find((r) => r.month === m && r.type === "EXPENSE");
      const incomeTotal = decToNumber(income?.total as never);
      const expenseTotal = decToNumber(expense?.total as never);
      return {
        month: m,
        name,
        income: incomeTotal,
        expense: expenseTotal,
        balance: incomeTotal - expenseTotal,
      };
    });

    const totalIncome = months.reduce((s, m) => s + m.income, 0);
    const totalExpense = months.reduce((s, m) => s + m.expense, 0);

    return {
      year,
      months,
      totals: {
        income: totalIncome,
        expense: totalExpense,
        balance: totalIncome - totalExpense,
        invested: decToNumber(invAgg._sum.amount),
      },
    };
  });

  // ── Resumo mensal: totais, por categoria (vs orçamento) e por tipo de pagamento ──
  app.get("/reports/monthly", async (req) => {
    const uid = userId(req);
    const { year, month } = monthlyQuery.parse(req.query);
    const range = monthRange(year, month);

    const [byType, byCategory, byPayment, budgets, categories, invAgg] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["type"],
        where: { userId: uid, date: range },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: { userId: uid, date: range, type: "EXPENSE" },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["paymentMethod"],
        where: { userId: uid, date: range, type: "EXPENSE" },
        _sum: { amount: true },
      }),
      prisma.budget.findMany({ where: { userId: uid, year, month } }),
      prisma.category.findMany({ where: { userId: uid } }),
      prisma.investment.aggregate({ where: { userId: uid, date: range }, _sum: { amount: true } }),
    ]);

    const income = decToNumber(byType.find((t) => t.type === "INCOME")?._sum.amount);
    const expense = decToNumber(byType.find((t) => t.type === "EXPENSE")?._sum.amount);

    const catMap = new Map(categories.map((c) => [c.id, c]));
    const budgetMap = new Map(budgets.map((b) => [b.categoryId, decToNumber(b.expectedAmount)]));

    // Gastos por categoria, comparando com o valor esperado (orçamento).
    const categoriesBreakdown = byCategory
      .map((row) => {
        const cat = row.categoryId ? catMap.get(row.categoryId) : null;
        const spent = decToNumber(row._sum.amount);
        const expected = row.categoryId ? budgetMap.get(row.categoryId) ?? 0 : 0;
        return {
          categoryId: row.categoryId,
          name: cat?.name ?? "Sem categoria",
          color: cat?.color ?? "#9AA4B2",
          icon: cat?.icon ?? "category",
          spent,
          expected,
          budgetUsage: expected > 0 ? spent / expected : null,
          percentageOfExpense: expense > 0 ? spent / expense : 0,
        };
      })
      .sort((a, b) => b.spent - a.spent);

    const paymentBreakdown = byPayment.map((row) => ({
      paymentMethod: row.paymentMethod,
      total: decToNumber(row._sum.amount),
    }));

    return {
      year,
      month,
      monthName: MONTH_NAMES[month - 1],
      totals: {
        income,
        expense,
        balance: income - expense,
        invested: decToNumber(invAgg._sum.amount),
      },
      byCategory: categoriesBreakdown,
      byPaymentMethod: paymentBreakdown,
    };
  });
}
