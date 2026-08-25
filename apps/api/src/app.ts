import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { AppError } from "./lib/errors.js";
import { authPlugin } from "./plugins/auth.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { categoriesRoutes } from "./modules/categories/categories.routes.js";
import { transactionsRoutes } from "./modules/transactions/transactions.routes.js";
import { recurringRoutes } from "./modules/recurring/recurring.routes.js";
import { budgetsRoutes } from "./modules/budgets/budgets.routes.js";
import { investmentsRoutes } from "./modules/investments/investments.routes.js";
import { goalsRoutes } from "./modules/goals/goals.routes.js";
import { reportsRoutes } from "./modules/reports/reports.routes.js";
import { bankRoutes } from "./modules/bank/bank.routes.js";
import { pluggyWebhookRoutes } from "./modules/bank/webhook.routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
          : undefined,
    },
  });

  // CORS: aceita a(s) origem(ns) de WEB_ORIGIN (separadas por vírgula) e,
  // opcionalmente, URLs de preview que casem com PREVIEW_ORIGIN_REGEX.
  const allowedOrigins = env.WEB_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);
  const previewRegex = env.PREVIEW_ORIGIN_REGEX ? new RegExp(env.PREVIEW_ORIGIN_REGEX) : null;

  // Segurança e infraestrutura
  // CSP desativado porque servimos o próprio frontend (que carrega fontes do Google).
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    credentials: true,
    origin: (origin, cb) => {
      // requisições sem Origin (curl, health checks, mobile nativo) são liberadas
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (previewRegex && previewRegex.test(origin)) return cb(null, true);
      return cb(new Error("Origin não permitida pelo CORS"), false);
    },
  });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await app.register(authPlugin);

  // Rotas
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(categoriesRoutes);
  await app.register(transactionsRoutes);
  await app.register(recurringRoutes);
  await app.register(budgetsRoutes);
  await app.register(investmentsRoutes);
  await app.register(goalsRoutes);
  await app.register(reportsRoutes);
  await app.register(bankRoutes);
  await app.register(pluggyWebhookRoutes);

  // Serve o frontend compilado (apps/web/dist), quando existir.
  // Em produção o build do site fica ao lado do backend e é servido pela mesma origem.
  const webDist = resolve(dirname(fileURLToPath(import.meta.url)), "../../web/dist");
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, wildcard: false });
    // Fallback de SPA: rotas de navegação (GET pedindo HTML) devolvem o index.html
    // para o React Router assumir. Chamadas de API continuam recebendo JSON 404.
    app.setNotFoundHandler((req, reply) => {
      if (req.method === "GET" && (req.headers.accept || "").includes("text/html")) {
        return reply.sendFile("index.html");
      }
      return reply.status(404).send({ error: "NOT_FOUND", message: "Rota não encontrada" });
    });
  }

  // Tratamento central de erros — respostas consistentes em JSON.
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Dados inválidos",
        issues: error.flatten().fieldErrors,
      });
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code ?? "APP_ERROR",
        message: error.message,
      });
    }
    if (error.statusCode === 429) {
      return reply.status(429).send({ error: "RATE_LIMITED", message: "Muitas requisições, tente em instantes" });
    }

    req.log.error(error);
    return reply.status(500).send({ error: "INTERNAL_ERROR", message: "Erro interno do servidor" });
  });

  return app;
}
