// Webhook público do Pluggy (SEM auth) — recebe eventos de item/transações e
// dispara a sincronização. Responde 200 rápido; o sync roda em background.
import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { syncItem } from "../../lib/bank-sync.js";

export async function pluggyWebhookRoutes(app: FastifyInstance) {
  app.post("/webhooks/pluggy", async (req, reply) => {
    const body = (req.body ?? {}) as { event?: string; itemId?: string };
    const { event, itemId } = body;

    // Só agimos se conhecermos o item (evita ruído/abuso). Isso também confirma
    // que o item pertence a algum usuário nosso antes de puxar dados.
    if (itemId) {
      const known = await prisma.bankConnection.findUnique({ where: { itemId } });
      if (known) {
        const shouldSync =
          !event ||
          event.startsWith("item/") ||
          event.startsWith("transactions/");
        if (shouldSync) {
          syncItem(itemId).catch((err) =>
            app.log.error({ err, itemId, event }, "sync via webhook falhou")
          );
        }
      }
    }

    // Sempre 200 pra o Pluggy não reenviar em loop.
    return reply.status(200).send({ received: true });
  });
}
