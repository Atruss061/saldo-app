// Rotas de Open Finance (conexões bancárias via Pluggy) — protegidas por auth.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { userId } from "../../lib/http.js";
import { BadRequest, NotFound } from "../../lib/errors.js";
import { env } from "../../config/env.js";
import {
  pluggyConfigured,
  createConnectToken,
  getItem,
  deleteItem,
} from "../../lib/pluggy.js";
import { syncItem } from "../../lib/bank-sync.js";

function webhookUrl(): string | undefined {
  const base = env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  return base ? `${base}/webhooks/pluggy` : undefined;
}

export async function bankRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // Gera o token de curta duração usado pelo widget Pluggy Connect no frontend.
  app.post("/bank/connect-token", async (req) => {
    if (!pluggyConfigured()) {
      throw BadRequest("Integração bancária não configurada no servidor", "PLUGGY_NOT_CONFIGURED");
    }
    const uid = userId(req);
    // itemId opcional: quando presente, o widget entra em modo "reconectar/atualizar".
    const body = z.object({ itemId: z.string().optional() }).parse(req.body ?? {});
    const accessToken = await createConnectToken({
      clientUserId: uid,
      webhookUrl: webhookUrl(),
      itemId: body.itemId,
    });
    return { accessToken };
  });

  // Lista as conexões do usuário (com as contas de cada uma).
  app.get("/bank/connections", async (req) => {
    const uid = userId(req);
    const connections = await prisma.bankConnection.findMany({
      where: { userId: uid },
      orderBy: { createdAt: "desc" },
      include: { accounts: true },
    });
    return {
      connections: connections.map((c) => ({
        ...c,
        accounts: c.accounts.map((a) => ({
          ...a,
          balance: a.balance != null ? Number(a.balance) : null,
        })),
      })),
    };
  });

  // Salva um item recém-criado pelo widget e dispara a 1ª sincronização.
  app.post("/bank/items", async (req, reply) => {
    if (!pluggyConfigured()) {
      throw BadRequest("Integração bancária não configurada no servidor", "PLUGGY_NOT_CONFIGURED");
    }
    const uid = userId(req);
    const { itemId } = z.object({ itemId: z.string().min(1) }).parse(req.body);

    // Confere o item no Pluggy (e evita que alguém “sequestre” um itemId de outra conta).
    const item = await getItem(itemId);

    const existing = await prisma.bankConnection.findUnique({ where: { itemId } });
    if (existing && existing.userId !== uid) {
      throw BadRequest("Este item já pertence a outra conta", "ITEM_TAKEN");
    }

    const conn = await prisma.bankConnection.upsert({
      where: { itemId },
      create: {
        userId: uid,
        itemId,
        status: item.status,
        connectorId: item.connector?.id ?? null,
        connectorName: item.connector?.name ?? null,
        connectorImage: item.connector?.imageUrl ?? null,
      },
      update: {
        status: item.status,
        connectorId: item.connector?.id ?? null,
        connectorName: item.connector?.name ?? null,
        connectorImage: item.connector?.imageUrl ?? null,
      },
    });

    // Sincroniza em background — não trava a resposta do widget.
    syncItem(itemId).catch((err) => app.log.error({ err, itemId }, "sync inicial falhou"));

    return reply.status(201).send({ connection: conn });
  });

  // Re-sincroniza uma conexão manualmente.
  app.post("/bank/connections/:id/sync", async (req) => {
    const uid = userId(req);
    const { id } = z.object({ id: z.string().cuid() }).parse(req.params);
    const conn = await prisma.bankConnection.findFirst({ where: { id, userId: uid } });
    if (!conn) throw NotFound("Conexão não encontrada");
    const result = await syncItem(conn.itemId);
    return { ...result };
  });

  // Remove a conexão (revoga o consentimento no Pluggy). As transações já importadas
  // permanecem no histórico do usuário.
  app.delete("/bank/connections/:id", async (req, reply) => {
    const uid = userId(req);
    const { id } = z.object({ id: z.string().cuid() }).parse(req.params);
    const conn = await prisma.bankConnection.findFirst({ where: { id, userId: uid } });
    if (!conn) throw NotFound("Conexão não encontrada");
    try {
      await deleteItem(conn.itemId);
    } catch (err) {
      app.log.warn({ err, itemId: conn.itemId }, "falha ao remover item no Pluggy");
    }
    await prisma.bankConnection.delete({ where: { id: conn.id } });
    return reply.status(204).send();
  });
}
