import argon2 from "argon2";
import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { Conflict, Unauthorized } from "../../lib/errors.js";
import { seedCategoriesForUser } from "../../lib/categories.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";

// Converte "7d" / "15m" em milissegundos para calcular expiração.
function ttlToMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const factor = unit === "s" ? 1e3 : unit === "m" ? 6e4 : unit === "h" ? 36e5 : 864e5;
  return value * factor;
}

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

function publicUser(user: { id: string; name: string; email: string }) {
  return { id: user.id, name: user.name, email: user.email };
}

// Emite access token (JWT curto) + refresh token (aleatório, persistido como hash).
async function issueTokens(app: FastifyInstance, user: { id: string; email: string }) {
  const accessToken = app.jwt.sign({ sub: user.id, email: user.email });

  const refreshToken = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + ttlToMs(env.JWT_REFRESH_TTL));

  await prisma.refreshToken.create({
    data: { tokenHash: sha256(refreshToken), userId: user.id, expiresAt },
  });

  return { accessToken, refreshToken };
}

export async function registerUser(app: FastifyInstance, input: RegisterInput) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw Conflict("Já existe uma conta com este e-mail", "EMAIL_TAKEN");

  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash },
  });

  // Cada novo usuário nasce com as 15 categorias padrão.
  await seedCategoriesForUser(user.id);

  const tokens = await issueTokens(app, user);
  return { user: publicUser(user), ...tokens };
}

export async function loginUser(app: FastifyInstance, input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Mensagem genérica de propósito — não revela se o e-mail existe.
  const invalid = Unauthorized("E-mail ou senha incorretos");
  if (!user) {
    // gasta tempo comparável para mitigar enumeração por timing
    await argon2.hash(input.password).catch(() => undefined);
    throw invalid;
  }

  const ok = await argon2.verify(user.passwordHash, input.password);
  if (!ok) throw invalid;

  const tokens = await issueTokens(app, user);
  return { user: publicUser(user), ...tokens };
}

// Rotação de refresh token: valida o antigo, revoga e emite um novo par.
export async function refreshTokens(app: FastifyInstance, refreshToken: string) {
  if (!refreshToken) throw Unauthorized("Refresh token ausente");

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(refreshToken) },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw Unauthorized("Sessão expirada, faça login novamente");
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokens(app, stored.user);
  return { user: publicUser(stored.user), ...tokens };
}

export async function logout(refreshToken?: string) {
  if (!refreshToken) return;
  await prisma.refreshToken
    .updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => undefined);
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Unauthorized();
  return publicUser(user);
}
