// Rotas de Open Finance Portugal (Enable Banking) — protegidas por auth.
import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { userId } from "../../lib/http.js";
import { BadRequest, NotFound } from "../../lib/errors.js";
import { env } from "../../config/env.js";
import {
  enableBankingConfigured,
  getAspsps,
  startAuth,
  createSession,
} from "../../lib/enablebanking.js";
import { syncNewSession, syncConnection } from "../../lib/eb-sync.js";

function redirectUrl(): string {
  const base = (env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  return `${base}/banco/callback`;
}

export async function bankRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // Lista os bancos de Portugal disponíveis.
  app.get("/bank/aspsps", async () => {
    if (!enableBankingConfigured()) {
      throw BadRequest("Integração bancária não configurada no servidor", "EB_NOT_CONFIGURED");
    }
    const aspsps = await getAspsps("PT", "personal");
    return {
      aspsps: aspsps.map((a) => ({ name: a.name, country: a.country, logo: a.logo ?? null })),
    };
  });

  // Inicia a autorização: devolve a URL do banco pra onde o utilizador é redirecionado.
  app.post("/bank/auth", async (req) => {
    if (!enableBankingConfigured()) {
      throw BadRequest("Integração bancária não configurada no servidor", "EB_NOT_CONFIGURED");
    }
    const { aspspName, country } = z
      .object({ aspspName: z.string().min(1), country: z.string().default("PT") })
      .parse(req.body);
    // Consentimento válido por ~89 dias (dentro do limite comum dos bancos).
    const validUntil = new Date(Date.now() + 89 * 24 * 60 * 60 * 1000).toISOString();
    const { url } = await startAuth({
      aspspName,
      country,
      redirectUrl: redirectUrl(),
      state: crypto.randomUUID(),
      validUntil,
      psuType: "personal",
    });
    return { url };
  });

  // Troca o `code` (do redirect) por uma sessão + contas, salva e sincroniza.
  app.post("/bank/session", async (req, reply) => {
    if (!enableBankingConfigured()) {
      throw BadRequest("Integração bancária não configurada no servidor", "EB_NOT_CONFIGURED");
    }
    const uid = userId(req);
    const { code } = z.object({ code: z.string().min(1) }).parse(req.body);

    const session = await createSession(code);

    const conn = await prisma.bankConnection.upsert({
      where: { itemId: session.session_id },
      create: {
        userId: uid,
        itemId: session.session_id,
        status: "UPDATED",
        connectorName: session.aspsp?.name ?? "Banco",
      },
      update: { status: "UPDATED", connectorName: session.aspsp?.name ?? "Banco" },
    });

    try {
      const result = await syncNewSession(uid, conn.id, session.accounts ?? []);
      return reply.status(201).send({ connection: conn, ...result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro desconhecido";
      app.log.error({ err }, "sync inicial (EB) falhou");
      // A conexão foi criada; devolvemos ok mas avisamos que o sync falhou.
      return reply.status(201).send({ connection: conn, accounts: 0, imported: 0, syncError: msg });
    }
  });

  // Lista as conexões do utilizador (com as contas).
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
        accounts: c.accounts.map((a) => ({ ...a, balance: a.balance != null ? Number(a.balance) : null })),
      })),
    };
  });

  // Re-sincroniza uma conexão.
  app.post("/bank/connections/:id/sync", async (req) => {
    const uid = userId(req);
    const { id } = z.object({ id: z.string().cuid() }).parse(req.params);
    const conn = await prisma.bankConnection.findFirst({ where: { id, userId: uid } });
    if (!conn) throw NotFound("Conexão não encontrada");
    try {
      const result = await syncConnection(conn.id);
      return { ...result };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro desconhecido";
      app.log.error({ err }, "sync (EB) falhou");
      throw BadRequest(msg, "SYNC_FAILED");
    }
  });

  // Remove a conexão (as transações já importadas permanecem).
  app.delete("/bank/connections/:id", async (req, reply) => {
    const uid = userId(req);
    const { id } = z.object({ id: z.string().cuid() }).parse(req.params);
    const conn = await prisma.bankConnection.findFirst({ where: { id, userId: uid } });
    if (!conn) throw NotFound("Conexão não encontrada");
    await prisma.bankConnection.delete({ where: { id: conn.id } });
    return reply.status(204).send();
  });
}
