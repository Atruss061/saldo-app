import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { userId } from "../../lib/http.js";
import { NotFound } from "../../lib/errors.js";
import { decToNumber, serializeMoney } from "../../lib/serialize.js";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor deve ser hex #RRGGBB");

const createSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  targetAmount: z.coerce.number().positive().max(1_000_000_000),
  targetDate: z.coerce.date().nullish(),
  color: hexColor.optional(),
  icon: z.string().max(60).optional(),
});
const updateSchema = createSchema.partial();
const idParams = z.object({ id: z.string().cuid() });
const contributionSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000_000),
  date: z.coerce.date(),
});

// Monta o objeto de meta com total guardado e progresso (%).
function withProgress(goal: {
  targetAmount: unknown;
  contributions: { amount: unknown }[];
} & Record<string, unknown>) {
  const target = decToNumber(goal.targetAmount as never);
  const saved = goal.contributions.reduce((sum, c) => sum + decToNumber(c.amount as never), 0);
  const { contributions, ...rest } = goal;
  return {
    ...serializeMoney(rest as Record<string, unknown>, ["targetAmount"]),
    savedAmount: saved,
    progress: target > 0 ? Math.min(1, saved / target) : 0,
  };
}

export async function goalsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // Listar metas com progresso
  app.get("/goals", async (req) => {
    const uid = userId(req);
    const rows = await prisma.goal.findMany({
      where: { userId: uid },
      orderBy: { createdAt: "asc" },
      include: { contributions: { select: { amount: true } } },
    });
    return { goals: rows.map(withProgress) };
  });

  // Criar
  app.post("/goals", async (req, reply) => {
    const uid = userId(req);
    const data = createSchema.parse(req.body);
    const goal = await prisma.goal.create({
      data: { ...data, userId: uid },
      include: { contributions: { select: { amount: true } } },
    });
    return reply.status(201).send({ goal: withProgress(goal) });
  });

  // Atualizar
  app.patch("/goals/:id", async (req) => {
    const uid = userId(req);
    const { id } = idParams.parse(req.params);
    const data = updateSchema.parse(req.body);
    const current = await prisma.goal.findFirst({ where: { id, userId: uid } });
    if (!current) throw NotFound("Meta não encontrada");
    const goal = await prisma.goal.update({
      where: { id },
      data,
      include: { contributions: { select: { amount: true } } },
    });
    return { goal: withProgress(goal) };
  });

  // Excluir (aportes caem em cascata)
  app.delete("/goals/:id", async (req, reply) => {
    const uid = userId(req);
    const { id } = idParams.parse(req.params);
    const current = await prisma.goal.findFirst({ where: { id, userId: uid } });
    if (!current) throw NotFound("Meta não encontrada");
    await prisma.goal.delete({ where: { id } });
    return reply.status(204).send();
  });

  // Listar aportes de uma meta
  app.get("/goals/:id/contributions", async (req) => {
    const uid = userId(req);
    const { id } = idParams.parse(req.params);
    const goal = await prisma.goal.findFirst({ where: { id, userId: uid } });
    if (!goal) throw NotFound("Meta não encontrada");
    const rows = await prisma.goalContribution.findMany({
      where: { goalId: id },
      orderBy: { date: "desc" },
    });
    return { contributions: rows.map((c) => serializeMoney(c, ["amount"])) };
  });

  // Adicionar aporte
  app.post("/goals/:id/contributions", async (req, reply) => {
    const uid = userId(req);
    const { id } = idParams.parse(req.params);
    const data = contributionSchema.parse(req.body);
    const goal = await prisma.goal.findFirst({ where: { id, userId: uid } });
    if (!goal) throw NotFound("Meta não encontrada");
    const contribution = await prisma.goalContribution.create({ data: { ...data, goalId: id } });
    return reply.status(201).send({ contribution: serializeMoney(contribution, ["amount"]) });
  });

  // Remover aporte
  app.delete("/goals/:goalId/contributions/:id", async (req, reply) => {
    const uid = userId(req);
    const params = z.object({ goalId: z.string().cuid(), id: z.string().cuid() }).parse(req.params);
    const goal = await prisma.goal.findFirst({ where: { id: params.goalId, userId: uid } });
    if (!goal) throw NotFound("Meta não encontrada");
    const contribution = await prisma.goalContribution.findFirst({
      where: { id: params.id, goalId: params.goalId },
    });
    if (!contribution) throw NotFound("Aporte não encontrado");
    await prisma.goalContribution.delete({ where: { id: params.id } });
    return reply.status(204).send();
  });
}
