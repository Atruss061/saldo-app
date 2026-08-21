import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { userId } from "../../lib/http.js";
import { BadRequest, NotFound } from "../../lib/errors.js";
import { serializeMoney } from "../../lib/serialize.js";
import { monthRange, nthBusinessDayOfMonth } from "../../lib/dates.js";

const money = z.coerce.number().positive("Valor deve ser positivo").max(1_000_000_000);

const baseSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
  // Descrição virou "observação" opcional — a categoria já identifica o fixo.
  description: z.string().max(160).trim().optional().default(""),
  amount: money,
  dayOfMonth: z.coerce.number().int().min(1).max(31),
  // quando true, dayOfMonth é o "N-ésimo dia útil" (ex.: 5 = 5º dia útil)
  businessDay: z.boolean().default(false),
  categoryId: z.string().cuid().nullish(),
  paymentMethod: z.enum(["DEBIT", "CREDIT", "TRANSFER", "AUTO_DEBIT", "PIX", "CASH"]).default("DEBIT"),
  active: z.boolean().default(true),
  startYear: z.coerce.number().int().min(2000).max(2100),
  startMonth: z.coerce.number().int().min(1).max(12),
});

const createSchema = baseSchema;
// PATCH aceita os campos do molde + o "alcance" da edição e o mês-âncora.
// scope: "this" (só o mês) | "future" (deste mês em diante) | "all" (todos).
// Sem scope → comportamento antigo (só atualiza o molde; ex.: ligar/desligar).
const updateSchema = baseSchema.partial().extend({
  scope: z.enum(["this", "future", "all"]).optional(),
  anchorYear: z.coerce.number().int().min(2000).max(2100).optional(),
  anchorMonth: z.coerce.number().int().min(1).max(12).optional(),
});
const idParams = z.object({ id: z.string().cuid() });

// dia do calendário para um mês, respeitando "dia útil" quando for o caso
function dayForMonth(y: number, m: number, dayOfMonth: number, businessDay: boolean) {
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return businessDay ? nthBusinessDayOfMonth(y, m, dayOfMonth) : Math.min(dayOfMonth, lastDay);
}

// Valor vigente de um gasto fixo para um mês (a vigência mais recente cujo
// início é <= aquele mês; se não houver anterior, usa a mais antiga; se não
// houver histórico, cai no `amount` do molde).
type AmountRow = { amount: unknown; effYear: number; effMonth: number };
function effectiveAmount(amounts: AmountRow[] | undefined, baseAmount: unknown, y: number, m: number): number {
  if (!amounts || amounts.length === 0) return Number(baseAmount);
  const key = y * 12 + m;
  const sorted = [...amounts].sort((a, b) => a.effYear * 12 + a.effMonth - (b.effYear * 12 + b.effMonth));
  let chosen = sorted[0]!;
  for (const a of sorted) {
    if (a.effYear * 12 + a.effMonth <= key) chosen = a;
    else break;
  }
  return Number(chosen.amount);
}
const applySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  force: z.boolean().default(false),
});

const MONEY = ["amount"] as const;

async function assertCategory(uid: string, categoryId?: string | null) {
  if (!categoryId) return;
  const cat = await prisma.category.findFirst({ where: { id: categoryId, userId: uid } });
  if (!cat) throw BadRequest("Categoria inválida", "INVALID_CATEGORY");
}

// Verifica se (startYear, startMonth) <= (year, month).
function startsBy(r: { startYear: number; startMonth: number }, year: number, month: number) {
  return r.startYear < year || (r.startYear === year && r.startMonth <= month);
}

export async function recurringRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // Listar os gastos fixos (moldes) do usuário
  app.get("/recurring", async (req) => {
    const uid = userId(req);
    const rows = await prisma.recurringExpense.findMany({
      where: { userId: uid },
      orderBy: [{ active: "desc" }, { dayOfMonth: "asc" }, { description: "asc" }],
      include: { category: { select: { id: true, name: true, color: true, icon: true } } },
    });
    return { recurring: rows.map((r) => serializeMoney(r, [...MONEY])) };
  });

  // Criar
  app.post("/recurring", async (req, reply) => {
    const uid = userId(req);
    const data = createSchema.parse(req.body);
    await assertCategory(uid, data.categoryId);
    const r = await prisma.recurringExpense.create({
      data: {
        ...data,
        userId: uid,
        // vigência inicial do valor (histórico começa no mês de início)
        amounts: { create: { amount: data.amount, effYear: data.startYear, effMonth: data.startMonth } },
      },
      include: { category: { select: { id: true, name: true, color: true, icon: true } } },
    });
    return reply.status(201).send({ recurring: serializeMoney(r, [...MONEY]) });
  });

  // Atualizar
  app.patch("/recurring/:id", async (req) => {
    const uid = userId(req);
    const { id } = idParams.parse(req.params);
    const { scope, anchorYear, anchorMonth, ...data } = updateSchema.parse(req.body);
    const current = await prisma.recurringExpense.findFirst({ where: { id, userId: uid } });
    if (!current) throw NotFound("Gasto fixo não encontrado");
    if ("categoryId" in data) await assertCategory(uid, data.categoryId);

    const inc = { category: { select: { id: true, name: true, color: true, icon: true } } };

    // Sem alcance → comportamento simples: só atualiza o molde (ex.: ligar/desligar).
    if (!scope) {
      const r = await prisma.recurringExpense.update({ where: { id }, data, include: inc });
      return { recurring: serializeMoney(r, [...MONEY]) };
    }

    // Valores efetivos após a edição (mescla molde atual + mudanças).
    const eff = {
      type: data.type ?? current.type,
      description: data.description ?? current.description,
      amount: data.amount ?? Number(current.amount),
      categoryId: "categoryId" in data ? data.categoryId ?? null : current.categoryId,
      paymentMethod: data.paymentMethod ?? current.paymentMethod,
      dayOfMonth: data.dayOfMonth ?? current.dayOfMonth,
      businessDay: data.businessDay ?? current.businessDay,
    };

    const now = new Date();
    const aYear = anchorYear ?? now.getUTCFullYear();
    const aMonth = anchorMonth ?? now.getUTCMonth() + 1;

    // Aplica os valores efetivos a um conjunto de ocorrências (recalculando a data do mês).
    async function applyTo(where: object) {
      const occ = await prisma.transaction.findMany({ where });
      for (const t of occ) {
        const d = new Date(t.date);
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth() + 1;
        const day = dayForMonth(y, m, eff.dayOfMonth, eff.businessDay);
        await prisma.transaction.update({
          where: { id: t.id },
          data: {
            type: eff.type,
            description: eff.description,
            amount: eff.amount,
            categoryId: eff.categoryId,
            paymentMethod: eff.paymentMethod,
            date: new Date(Date.UTC(y, m - 1, day)),
          },
        });
      }
    }

    if (scope === "this") {
      // Exceção do mês: NÃO altera o molde. Atualiza (ou cria) só o lançamento do mês-âncora.
      const range = monthRange(aYear, aMonth);
      const existing = await prisma.transaction.findFirst({
        where: { userId: uid, recurringId: id, date: range },
      });
      const day = dayForMonth(aYear, aMonth, eff.dayOfMonth, eff.businessDay);
      const date = new Date(Date.UTC(aYear, aMonth - 1, day));
      if (existing) {
        await prisma.transaction.update({
          where: { id: existing.id },
          data: {
            type: eff.type,
            description: eff.description,
            amount: eff.amount,
            categoryId: eff.categoryId,
            paymentMethod: eff.paymentMethod,
            date,
            manuallyEdited: true,
          },
        });
      } else {
        await prisma.transaction.create({
          data: {
            userId: uid,
            type: eff.type,
            description: eff.description,
            amount: eff.amount,
            date,
            categoryId: eff.categoryId,
            paymentMethod: eff.paymentMethod,
            isFixed: true,
            isPaid: false,
            installments: 1,
            recurringId: id,
            manuallyEdited: true,
          },
        });
      }
      // molde permanece inalterado
      const r = await prisma.recurringExpense.findUnique({ where: { id }, include: inc });
      return { recurring: serializeMoney(r!, [...MONEY]) };
    }

    // "future" | "all": atualiza o molde e propaga para as ocorrências
    // (nunca sobrescreve meses já pagos nem ajustes manuais).
    const r = await prisma.recurringExpense.update({ where: { id }, data, include: inc });

    // Histórico de valores (vigência) — só mexe se o VALOR mudou.
    const amountChanged = data.amount !== undefined && Number(data.amount) !== Number(current.amount);
    if (amountChanged) {
      if (scope === "future") {
        // nova vigência a partir do mês-âncora; remove a âncora antiga e vigências agendadas depois dela
        await prisma.recurringAmount.deleteMany({
          where: {
            recurringId: id,
            OR: [{ effYear: { gt: aYear } }, { effYear: aYear, effMonth: { gte: aMonth } }],
          },
        });
        await prisma.recurringAmount.create({
          data: { recurringId: id, amount: eff.amount, effYear: aYear, effMonth: aMonth },
        });
      } else {
        // all: colapsa o histórico num único valor, válido desde o início do molde
        await prisma.recurringAmount.deleteMany({ where: { recurringId: id } });
        await prisma.recurringAmount.create({
          data: { recurringId: id, amount: eff.amount, effYear: current.startYear, effMonth: current.startMonth },
        });
      }
    }

    const baseWhere = { userId: uid, recurringId: id, isPaid: false, manuallyEdited: false };
    if (scope === "future") {
      await applyTo({ ...baseWhere, date: { gte: new Date(Date.UTC(aYear, aMonth - 1, 1)) } });
    } else {
      await applyTo(baseWhere); // all
    }

    return { recurring: serializeMoney(r, [...MONEY]) };
  });

  // Excluir o molde (as ocorrências já geradas ficam, com recurringId = null)
  app.delete("/recurring/:id", async (req, reply) => {
    const uid = userId(req);
    const { id } = idParams.parse(req.params);
    const current = await prisma.recurringExpense.findFirst({ where: { id, userId: uid } });
    if (!current) throw NotFound("Gasto fixo não encontrado");
    await prisma.recurringExpense.delete({ where: { id } });
    return reply.status(204).send();
  });

  // Gera as ocorrências do mês a partir dos moldes ativos.
  // Idempotente: sem `force`, só roda uma vez por (usuário, ano, mês) — assim,
  // itens que o usuário apagou naquele mês não voltam. Com `force`, gera o que faltar.
  app.post("/recurring/apply", async (req) => {
    const uid = userId(req);
    const { year, month, force } = applySchema.parse(req.body);

    const already = await prisma.recurringApplied.findUnique({
      where: { userId_year_month: { userId: uid, year, month } },
    });
    if (already && !force) return { created: 0, alreadyApplied: true };

    const molds = await prisma.recurringExpense.findMany({
      where: { userId: uid, active: true },
      include: { amounts: true },
    });
    const valid = molds.filter((r) => startsBy(r, year, month));

    let created = 0;
    if (valid.length) {
      const range = monthRange(year, month);
      // Ocorrências já existentes neste mês, por molde.
      const existing = await prisma.transaction.findMany({
        where: { userId: uid, recurringId: { in: valid.map((r) => r.id) }, date: range },
        select: { recurringId: true },
      });
      const done = new Set(existing.map((t) => t.recurringId));
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

      const toCreate = valid
        .filter((r) => !done.has(r.id))
        .map((r) => {
          const day = r.businessDay
            ? nthBusinessDayOfMonth(year, month, r.dayOfMonth)
            : Math.min(r.dayOfMonth, lastDay);
          return {
            userId: uid,
            type: r.type,
            description: r.description,
            amount: effectiveAmount(r.amounts, r.amount, year, month),
            date: new Date(Date.UTC(year, month - 1, day)),
            categoryId: r.categoryId,
            paymentMethod: r.paymentMethod,
            isFixed: true,
            isPaid: false,
            installments: 1,
            recurringId: r.id,
          };
        });

      if (toCreate.length) {
        const res = await prisma.transaction.createMany({ data: toCreate });
        created = res.count;
      }
    }

    // Marca o mês como já processado (idempotência).
    await prisma.recurringApplied.upsert({
      where: { userId_year_month: { userId: uid, year, month } },
      create: { userId: uid, year, month },
      update: {},
    });

    return { created };
  });
}
