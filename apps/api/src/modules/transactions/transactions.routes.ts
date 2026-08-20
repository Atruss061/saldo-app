import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { userId } from "../../lib/http.js";
import { BadRequest, NotFound } from "../../lib/errors.js";
import { serializeMoney } from "../../lib/serialize.js";
import { monthRange } from "../../lib/dates.js";

const money = z.coerce.number().positive("Valor deve ser positivo").max(1_000_000_000);

const baseSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  // Descrição virou "observação" opcional — a categoria já identifica o lançamento.
  description: z.string().max(160).trim().optional().default(""),
  amount: money,
  date: z.coerce.date(),
  categoryId: z.string().cuid().nullish(),
  paymentMethod: z.enum(["DEBIT", "CREDIT", "TRANSFER", "AUTO_DEBIT", "PIX", "CASH"]).default("DEBIT"),
  isFixed: z.boolean().default(false),
  isPaid: z.boolean().default(true),
  installments: z.number().int().min(1).max(360).default(1),
  notes: z.string().max(500).optional(),
});

const createSchema = baseSchema;
const updateSchema = baseSchema.partial();
const idParams = z.object({ id: z.string().cuid() });

const listQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  categoryId: z.string().cuid().optional(),
  paymentMethod: z.enum(["DEBIT", "CREDIT", "TRANSFER", "AUTO_DEBIT", "PIX", "CASH"]).optional(),
  isFixed: z.enum(["true", "false"]).optional(),
  search: z.string().trim().max(160).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

const MONEY_FIELDS = ["amount"] as const;

// Garante que a categoria (se informada) pertence ao usuário.
async function assertCategory(uid: string, categoryId?: string | null) {
  if (!categoryId) return;
  const cat = await prisma.category.findFirst({ where: { id: categoryId, userId: uid } });
  if (!cat) throw BadRequest("Categoria inválida", "INVALID_CATEGORY");
}

export async function transactionsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // Listar com filtros + paginação
  app.get("/transactions", async (req) => {
    const uid = userId(req);
    const q = listQuery.parse(req.query);

    const where: Prisma.TransactionWhereInput = { userId: uid };
    if (q.type) where.type = q.type;
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.paymentMethod) where.paymentMethod = q.paymentMethod;
    if (q.isFixed) where.isFixed = q.isFixed === "true";
    if (q.search) where.description = { contains: q.search, mode: "insensitive" };
    if (q.year && q.month) where.date = monthRange(q.year, q.month);
    else if (q.year) where.date = { gte: new Date(Date.UTC(q.year, 0, 1)), lt: new Date(Date.UTC(q.year + 1, 0, 1)) };

    const [total, rows] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { category: { select: { id: true, name: true, color: true, icon: true } } },
      }),
    ]);

    return {
      transactions: rows.map((t) => serializeMoney(t, [...MONEY_FIELDS])),
      pagination: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) },
    };
  });

  // Detalhe
  app.get("/transactions/:id", async (req) => {
    const uid = userId(req);
    const { id } = idParams.parse(req.params);
    const t = await prisma.transaction.findFirst({
      where: { id, userId: uid },
      include: { category: { select: { id: true, name: true, color: true, icon: true } } },
    });
    if (!t) throw NotFound("Lançamento não encontrado");
    return { transaction: serializeMoney(t, [...MONEY_FIELDS]) };
  });

  // Criar
  app.post("/transactions", async (req, reply) => {
    const uid = userId(req);
    const data = createSchema.parse(req.body);
    await assertCategory(uid, data.categoryId);

    const t = await prisma.transaction.create({
      data: { ...data, userId: uid },
      include: { category: { select: { id: true, name: true, color: true, icon: true } } },
    });
    return reply.status(201).send({ transaction: serializeMoney(t, [...MONEY_FIELDS]) });
  });

  // Atualizar
  app.patch("/transactions/:id", async (req) => {
    const uid = userId(req);
    const { id } = idParams.parse(req.params);
    const data = updateSchema.parse(req.body);

    const current = await prisma.transaction.findFirst({ where: { id, userId: uid } });
    if (!current) throw NotFound("Lançamento não encontrado");
    if ("categoryId" in data) await assertCategory(uid, data.categoryId);

    // Se é uma ocorrência gerada por um gasto fixo e o usuário está editando à mão,
    // marca como "ajuste manual" → a propagação a partir do molde não a sobrescreve.
    const patch = current.recurringId ? { ...data, manuallyEdited: true } : data;

    const t = await prisma.transaction.update({
      where: { id },
      data: patch,
      include: { category: { select: { id: true, name: true, color: true, icon: true } } },
    });
    return { transaction: serializeMoney(t, [...MONEY_FIELDS]) };
  });

  // Excluir
  app.delete("/transactions/:id", async (req, reply) => {
    const uid = userId(req);
    const { id } = idParams.parse(req.params);
    const current = await prisma.transaction.findFirst({ where: { id, userId: uid } });
    if (!current) throw NotFound("Lançamento não encontrado");
    await prisma.transaction.delete({ where: { id } });
    return reply.status(204).send();
  });
}
