# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Dependências (inclui devDependencies para compilar)
COPY package.json ./
RUN npm install --include=dev

# Gera o Prisma Client e compila o TypeScript
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copia dependências já instaladas, client gerado, build e prisma (para migrate deploy)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

EXPOSE 3333

# Aplica as migrations e sobe a API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
