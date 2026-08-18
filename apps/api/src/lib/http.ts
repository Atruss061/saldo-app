import type { FastifyRequest } from "fastify";
import { Unauthorized } from "./errors.js";

// Extrai o userId do token já verificado pelo preHandler `authenticate`.
export function userId(req: FastifyRequest): string {
  const id = req.currentUser?.sub;
  if (!id) throw Unauthorized();
  return id;
}
