import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../../config/env.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import {
  convertCurrency,
  deleteAccount,
  getMe,
  loginUser,
  logout,
  refreshTokens,
  registerUser,
  updateProfile,
} from "./auth.service.js";

const REFRESH_COOKIE = "saldo_rt";
const isProd = env.NODE_ENV === "production";

// Moedas suportadas (moeda única de exibição).
const currencyEnum = z.enum(["BRL", "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "ARS", "MXN"]);

// O refresh token vai num cookie httpOnly (não acessível por JS → mitiga XSS).
// Site e API são servidos pela mesma origem, então SameSite=Lax é suficiente e seguro.
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/", // enviado em qualquer rota → evita a sessão "sumir" ao recarregar
  maxAge: 7 * 24 * 60 * 60, // 7 dias em segundos
};

export async function authRoutes(app: FastifyInstance) {
  // Lê o refresh token do corpo (localStorage do front) ou, como reserva, do cookie.
  const readRefreshToken = (req: { body?: unknown; cookies: Record<string, string | undefined> }) => {
    const fromBody = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
    return fromBody || req.cookies[REFRESH_COOKIE] || "";
  };

  app.post("/auth/register", async (req, reply) => {
    const input = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await registerUser(app, input);
    reply.setCookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    // refreshToken também vai no corpo → o front guarda no localStorage (persistência confiável).
    return reply.status(201).send({ user, accessToken, refreshToken });
  });

  app.post("/auth/login", async (req, reply) => {
    const input = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await loginUser(app, input);
    reply.setCookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    return reply.send({ user, accessToken, refreshToken });
  });

  app.post("/auth/refresh", async (req, reply) => {
    const token = readRefreshToken(req);
    const { user, accessToken, refreshToken } = await refreshTokens(app, token);
    reply.setCookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    return reply.send({ user, accessToken, refreshToken });
  });

  app.post("/auth/logout", async (req, reply) => {
    await logout(readRefreshToken(req));
    reply.clearCookie(REFRESH_COOKIE, { path: "/" });
    return reply.status(204).send();
  });

  app.get("/auth/me", { preHandler: [app.authenticate] }, async (req) => {
    const user = await getMe(req.currentUser!.sub);
    return { user };
  });

  // Atualiza preferências do perfil (moeda de exibição; nome).
  app.patch("/auth/me", { preHandler: [app.authenticate] }, async (req) => {
    const body = z
      .object({
        currency: currencyEnum.optional(),
        name: z.string().min(1).max(120).trim().optional(),
      })
      .parse(req.body);
    const user = await updateProfile(req.currentUser!.sub, body);
    return { user };
  });

  // Converte todos os valores por uma taxa e troca a moeda (ao mudar de moeda).
  app.post("/auth/convert-currency", { preHandler: [app.authenticate] }, async (req) => {
    const { currency, rate } = z
      .object({ currency: currencyEnum, rate: z.coerce.number().positive().max(1_000_000) })
      .parse(req.body);
    const user = await convertCurrency(req.currentUser!.sub, currency, rate);
    return { user };
  });

  // Exclui a conta do usuário logado (confirmação por senha).
  app.delete("/auth/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { password } = z.object({ password: z.string().min(1, "Informe a senha") }).parse(req.body);
    await deleteAccount(req.currentUser!.sub, password);
    reply.clearCookie(REFRESH_COOKIE, { path: "/" });
    return reply.status(204).send();
  });
}
