import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { userId } from "../../lib/http.js";
import { BadRequest, NotFound } from "../../lib/errors.js";
import { serializeMoney } from "../../lib/serialize.js";
import { monthRange } from "../../lib/dates.js";

const money = z.coerce.number().positive("Valor deve ser positivo").max(1_000_000_000);

const baseSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
  // Descrição virou "observação" opcional — a categoria já identifica o fixo.
  description: z.string().max(160).trim().optional().default(""),
  amount: money,
  dayOfMonth: z.coerce.number().int().min(1).max(31),
  categoryId: z.string().cuid().nullish(),
  paymentMethod: z.enum(["DEBIT", "CREDIT", "TRANSFER", "AUTO_DEBIT", "PIX", "CASH"]).default("DEBIT"),
  active: z.boolean().default(true),
  startYear: z.coerce.number().int().min(2000).max(2100),
  startMonth: z.coerce.number().int().min(1).max(12),
});

const createSchema = baseSchema;
const updateSchema = baseSchema.partial();
const idParams = z.object({ id: z.string().cuid() });
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
      data: { ...data, userId: uid },
      include: { category: { select: { id: true, name: true, color: true, icon: true } } },
    });
    return reply.status(201).send({ recurring: serializeMoney(r, [...MONEY]) });
  });

  // Atualizar
  app.patch("/recurring/:id", async (req) => {
    const uid = userId(req);
    const { id } = idParams.parse(req.params);
    const data = updateSchema.parse(req.body);
    const current = await prisma.recurringExpense.findFirst({ where: { id, userId: uid } });
    if (!current) throw NotFound("Gasto fixo não encontrado");
    if ("categoryId" in data) await assertCategory(uid, data.categoryId);
    const r = await prisma.recurringExpense.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true, color: true, icon: true } } },
    });
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

    const molds = await prisma.recurringExpense.findMany({ where: { userId: uid, active: true } });
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
          const day = Math.min(r.dayOfMonth, lastDay);
          return {
            userId: uid,
            type: r.type,
            description: r.description,
            amount: r.amount,
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
