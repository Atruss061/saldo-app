import type { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import { env } from "../config/env.js";

// Conteúdo do access token.
export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
}

declare module "fastify" {
  interface FastifyInstance {
    // preHandler que exige usuário autenticado
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    // preenchido após autenticação
    currentUser?: AccessTokenPayload;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AccessTokenPayload;
    user: AccessTokenPayload;
  }
}

// Plugin: registra JWT + cookies e expõe o preHandler `authenticate`.
export const authPlugin = fp(async (app) => {
  await app.register(fastifyCookie);

  await app.register(fastifyJwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_TTL },
  });

  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await req.jwtVerify<AccessTokenPayload>();
      req.currentUser = payload;
    } catch {
      return reply.status(401).send({ error: "UNAUTHORIZED", message: "Token inválido ou expirado" });
    }
  });
});
