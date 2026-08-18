import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { userId } from "../../lib/http.js";
import { BadRequest, NotFound } from "../../lib/errors.js";
import { serializeMoney } from "../../lib/serialize.js";

const upsertSchema = z.object({
  categoryId: z.string().cuid(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  expectedAmount: z.coerce.number().nonnegative().max(1_000_000_000),
});

const listQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const idParams = z.object({ id: z.string().cuid() });

export async function budgetsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // Listar orçamentos de um mês
  app.get("/budgets", async (req) => {
    const uid = userId(req);
    const { year, month } = listQuery.parse(req.query);
    const rows = await prisma.budget.findMany({
      where: { userId: uid, year, month },
      include: { category: { select: { id: true, name: true, color: true, icon: true } } },
    });
    return { budgets: rows.map((b) => serializeMoney(b, ["expectedAmount"])) };
  });

  // Definir/atualizar (upsert por categoria/mês)
  app.put("/budgets", async (req) => {
    const uid = userId(req);
    const data = upsertSchema.parse(req.body);

    const cat = await prisma.category.findFirst({ where: { id: data.categoryId, userId: uid } });
    if (!cat) throw BadRequest("Categoria inválida", "INVALID_CATEGORY");

    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_year_month: {
          userId: uid,
          categoryId: data.categoryId,
          year: data.year,
          month: data.month,
        },
      },
      update: { expectedAmount: data.expectedAmount },
      create: { ...data, userId: uid },
      include: { category: { select: { id: true, name: true, color: true, icon: true } } },
    });
    return { budget: serializeMoney(budget, ["expectedAmount"]) };
  });

  // Remover um orçamento
  app.delete("/budgets/:id", async (req, reply) => {
    const uid = userId(req);
    const { id } = idParams.parse(req.params);
    const current = await prisma.budget.findFirst({ where: { id, userId: uid } });
    if (!current) throw NotFound("Orçamento não encontrado");
    await prisma.budget.delete({ where: { id } });
    return reply.status(204).send();
  });
}
