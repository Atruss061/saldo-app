import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { userId } from "../../lib/http.js";
import { Conflict, NotFound } from "../../lib/errors.js";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor deve ser hex #RRGGBB");

const createSchema = z.object({
  name: z.string().min(1).max(60).trim(),
  description: z.string().max(240).optional(),
  color: hexColor.optional(),
  icon: z.string().max(60).optional(),
});

const updateSchema = createSchema.partial();
const idParams = z.object({ id: z.string().cuid() });

export async function categoriesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // Listar
  app.get("/categories", async (req) => {
    const categories = await prisma.category.findMany({
      where: { userId: userId(req) },
      orderBy: { name: "asc" },
    });
    return { categories };
  });

  // Criar
  app.post("/categories", async (req, reply) => {
    const uid = userId(req);
    const data = createSchema.parse(req.body);
    const exists = await prisma.category.findUnique({
      where: { userId_name: { userId: uid, name: data.name } },
    });
    if (exists) throw Conflict("Já existe uma categoria com esse nome", "CATEGORY_EXISTS");

    const category = await prisma.category.create({ data: { ...data, userId: uid } });
    return reply.status(201).send({ category });
  });

  // Atualizar
  app.patch("/categories/:id", async (req) => {
    const uid = userId(req);
    const { id } = idParams.parse(req.params);
    const data = updateSchema.parse(req.body);

    const current = await prisma.category.findFirst({ where: { id, userId: uid } });
    if (!current) throw NotFound("Categoria não encontrada");

    if (data.name && data.name !== current.name) {
      const dup = await prisma.category.findUnique({
        where: { userId_name: { userId: uid, name: data.name } },
      });
      if (dup) throw Conflict("Já existe uma categoria com esse nome", "CATEGORY_EXISTS");
    }

    const category = await prisma.category.update({ where: { id }, data });
    return { category };
  });

  // Excluir (transações ligadas ficam com categoria nula — SetNull no schema)
  app.delete("/categories/:id", async (req, reply) => {
    const uid = userId(req);
    const { id } = idParams.parse(req.params);
    const current = await prisma.category.findFirst({ where: { id, userId: uid } });
    if (!current) throw NotFound("Categoria não encontrada");

    await prisma.category.delete({ where: { id } });
    return reply.status(204).send();
  });
}
