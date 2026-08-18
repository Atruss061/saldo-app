import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { userId } from "../../lib/http.js";
import { NotFound } from "../../lib/errors.js";
import { serializeMoney } from "../../lib/serialize.js";
import { yearRange } from "../../lib/dates.js";

const baseSchema = z.object({
  type: z.enum(["RESERVE", "FIXED_INCOME", "VARIABLE_INCOME"]),
  amount: z.coerce.number().max(1_000_000_000),
  date: z.coerce.date(),
  notes: z.string().max(500).optional(),
});

const createSchema = baseSchema;
const updateSchema = baseSchema.partial();
const idParams = z.object({ id: z.string().cuid() });
const listQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  type: z.enum(["RESERVE", "FIXED_INCOME", "VARIABLE_INCOME"]).optional(),
});

export async function investmentsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/investments", async (req) => {
    const uid = userId(req);
    const q = listQuery.parse(req.query);
    const where: Prisma.InvestmentWhereInput = { userId: uid };
    if (q.type) where.type = q.type;
    if (q.year) where.date = yearRange(q.year);

    const rows = await prisma.investment.findMany({ where, orderBy: { date: "desc" } });
    return { investments: rows.map((i) => serializeMoney(i, ["amount"])) };
  });

  app.post("/investments", async (req, reply) => {
    const uid = userId(req);
    const data = createSchema.parse(req.body);
    const inv = await prisma.investment.create({ data: { ...data, userId: uid } });
    return reply.status(201).send({ investment: serializeMoney(inv, ["amount"]) });
  });

  app.patch("/investments/:id", async (req) => {
    const uid = userId(req);
    const { id } = idParams.parse(req.params);
    const data = updateSchema.parse(req.body);
    const current = await prisma.investment.findFirst({ where: { id, userId: uid } });
    if (!current) throw NotFound("Investimento não encontrado");
    const inv = await prisma.investment.update({ where: { id }, data });
    return { investment: serializeMoney(inv, ["amount"]) };
  });

  app.delete("/investments/:id", async (req, reply) => {
    const uid = userId(req);
    const { id } = idParams.parse(req.params);
    const current = await prisma.investment.findFirst({ where: { id, userId: uid } });
    if (!current) throw NotFound("Investimento não encontrado");
    await prisma.investment.delete({ where: { id } });
    return reply.status(204).send();
  });
}
