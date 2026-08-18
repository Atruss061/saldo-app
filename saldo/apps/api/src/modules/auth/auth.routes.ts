import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import {
  getMe,
  loginUser,
  logout,
  refreshTokens,
  registerUser,
} from "./auth.service.js";

const REFRESH_COOKIE = "saldo_rt";
const isProd = env.NODE_ENV === "production";

// O refresh token vai num cookie httpOnly (não acessível por JS → mitiga XSS).
// Site e API são servidos pela mesma origem, então SameSite=Lax é suficiente e seguro.
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/auth",
  maxAge: 7 * 24 * 60 * 60, // 7 dias em segundos
};

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (req, reply) => {
    const input = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await registerUser(app, input);
    reply.setCookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    return reply.status(201).send({ user, accessToken });
  });

  app.post("/auth/login", async (req, reply) => {
    const input = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await loginUser(app, input);
    reply.setCookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    return reply.send({ user, accessToken });
  });

  app.post("/auth/refresh", async (req, reply) => {
    const token = req.cookies[REFRESH_COOKIE] ?? "";
    const { user, accessToken, refreshToken } = await refreshTokens(app, token);
    reply.setCookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    return reply.send({ user, accessToken });
  });

  app.post("/auth/logout", async (req, reply) => {
    await logout(req.cookies[REFRESH_COOKIE]);
    reply.clearCookie(REFRESH_COOKIE, { path: "/auth" });
    return reply.status(204).send();
  });

  app.get("/auth/me", { preHandler: [app.authenticate] }, async (req) => {
    const user = await getMe(req.currentUser!.sub);
    return { user };
  });
}
