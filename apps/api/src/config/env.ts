import "dotenv/config";
import { z } from "zod";

// Valida e tipa as variáveis de ambiente na inicialização.
// Se algo estiver faltando, o processo falha cedo com mensagem clara.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().url(),
  // Origem(ns) permitida(s) no CORS. Pode ser uma URL ou várias separadas por vírgula.
  // No Render, cai automaticamente na URL pública do serviço (RENDER_EXTERNAL_URL).
  WEB_ORIGIN: z.string().default(process.env.RENDER_EXTERNAL_URL ?? "http://localhost:5173"),
  // Regex opcional para liberar URLs de preview (ex.: "^https://saldo-.*\\.vercel\\.app$").
  PREVIEW_ORIGIN_REGEX: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET muito curto"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET muito curto"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  // ── Open Finance (Pluggy) ── opcionais: a integração só liga se estiverem presentes.
  PLUGGY_CLIENT_ID: z.string().optional(),
  PLUGGY_CLIENT_SECRET: z.string().optional(),
  // URL pública base do backend, usada para montar a URL do webhook do Pluggy.
  // No Render, cai em RENDER_EXTERNAL_URL automaticamente.
  PUBLIC_BASE_URL: z.string().optional().default(process.env.RENDER_EXTERNAL_URL ?? ""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variáveis de ambiente inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
