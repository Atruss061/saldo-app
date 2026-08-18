# Saldo — App de Finanças Pessoais

Monorepo do **Saldo**, app web de controle financeiro pessoal (substitui a planilha).
Stack: **Node + TypeScript (Fastify + Prisma)** · **React + Vite** · **PostgreSQL**.

> **Status atual:** ✅ Projeto completo (Partes 2–5). Backend (banco + autenticação + API de negócio + agregações) e frontend inteiro ligado à API — todas as telas (Dashboard, Mês, Investimentos, Metas, Categorias) consumindo dados reais, com o modal de novo lançamento criando transações no banco.

## Estrutura

```
saldo/
├── apps/
│   ├── api/      → backend (Fastify + Prisma + Postgres)
│   └── web/      → frontend React (em breve)
├── packages/
│   └── shared/   → tipos compartilhados (em breve)
└── docker-compose.yml → Postgres local
```

## Pré-requisitos

- Node.js 20+
- Docker (para o Postgres) — ou um Postgres já instalado

## Como rodar o backend (dev)

```bash
# 1. Subir o banco Postgres
docker compose up -d db

# 2. Instalar dependências
cd apps/api
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# edite .env e troque os segredos JWT (openssl rand -base64 48)

# 4. Rodar as migrations (cria as tabelas)
npm run prisma:migrate

# 5. Gerar o Prisma Client
npm run prisma:generate

# 6. Subir a API em modo dev
npm run dev
```

A API sobe em `http://localhost:3333`.

## Como rodar o frontend (dev)

```bash
cd apps/web
npm install
cp .env.example .env   # ajuste VITE_API_URL se necessário
npm run dev
```

O app sobe em `http://localhost:5173`. Crie uma conta em "Criar conta" (as 15 categorias já vêm semeadas) e faça login.

Design system (cores, fontes, raios) extraído do `DESIGN.md` gerado pelo Stitch e aplicado no `tailwind.config.js`.

### Fluxo completo para rodar tudo

```bash
# 1. Banco
docker compose up -d db
# 2. Backend
cd apps/api && npm install && cp .env.example .env
npm run prisma:migrate && npm run prisma:generate && npm run dev
# 3. Frontend (em outro terminal)
cd apps/web && npm install && cp .env.example .env && npm run dev
```

Abra `http://localhost:5173`, crie uma conta (as 15 categorias já vêm prontas) e comece a lançar. O botão **"Novo lançamento"** grava no banco e os dashboards se atualizam sozinhos.

## Telas do frontend (todas ligadas à API)

- **Dashboard** — KPIs do ano, fluxo de caixa (barras), evolução do saldo (área) e detalhamento mensal, do endpoint `/reports/annual`. Seletor de ano.
- **Mês** — resumo, entradas, rosca de distribuição, gastos por categoria vs orçamento, tipos de pagamento e as tabelas de fixos/débito/cartão. Seletor de mês.
- **Investimentos** — totais por tipo, evolução por mês (empilhado) e histórico; criar investimento.
- **Metas** — cards com progresso, criar meta, adicionar aporte e excluir.
- **Categorias** — grade de categorias; criar e excluir.

## Endpoints já disponíveis (Parte 2)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | status da API |
| GET | `/health/db` | status da conexão com o banco |
| POST | `/auth/register` | cria conta (semeia as 15 categorias) |
| POST | `/auth/login` | login (retorna access token + cookie de refresh) |
| POST | `/auth/refresh` | renova o access token (rotação de refresh) |
| POST | `/auth/logout` | encerra a sessão (revoga o refresh token) |
| GET | `/auth/me` | dados do usuário logado (requer token) |

### Endpoints de negócio (Parte 3 — todos exigem token)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/categories` | listar / criar categoria |
| PATCH/DELETE | `/categories/:id` | editar / excluir categoria |
| GET/POST | `/transactions` | listar (filtros: `year`, `month`, `type`, `categoryId`, `paymentMethod`, `isFixed`, `page`, `pageSize`) / criar |
| GET/PATCH/DELETE | `/transactions/:id` | detalhe / editar / excluir |
| GET | `/budgets?year&month` | orçamentos do mês |
| PUT | `/budgets` | definir/atualizar orçamento (upsert por categoria/mês) |
| DELETE | `/budgets/:id` | remover orçamento |
| GET/POST | `/investments` | listar (filtros: `year`, `type`) / criar |
| PATCH/DELETE | `/investments/:id` | editar / excluir |
| GET/POST | `/goals` | listar (com progresso) / criar meta |
| PATCH/DELETE | `/goals/:id` | editar / excluir meta |
| GET/POST | `/goals/:id/contributions` | listar / adicionar aporte |
| DELETE | `/goals/:goalId/contributions/:id` | remover aporte |
| GET | `/reports/annual?year` | panorama anual (por mês + totais) |
| GET | `/reports/monthly?year&month` | resumo mensal (por categoria vs orçamento, por tipo de pagamento) |

> **Importante:** rode `npm run prisma:generate` antes de `npm run typecheck`/`dev`. O Prisma Client é gerado a partir do schema — sem essa etapa, o TypeScript não conhece os tipos do banco (é o passo padrão de qualquer projeto Prisma).

### Exemplo rápido

```bash
# registrar
curl -X POST http://localhost:3333/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Carlos","email":"carlos@exemplo.com","password":"senha12345"}'

# login
curl -X POST http://localhost:3333/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"carlos@exemplo.com","password":"senha12345"}'
```

## Decisões de banco de dados (boas práticas)

- **Dinheiro em `Decimal` (`NUMERIC(14,2)`)** — nunca float, sem erro de arredondamento.
- **Multi-tenant:** todo dado tem `userId` (FK + índice) e é apagado em cascata com o usuário.
- **Constraints únicas com escopo por usuário** (ex.: nome de categoria único por usuário; um orçamento por categoria/mês).
- **Enums** para `TransactionType`, `PaymentMethod`, `InvestmentType`.
- **Índices** em `(userId, date)`, `(userId, categoryId)`, `(userId, type)` para relatórios rápidos.
- **Refresh tokens persistidos como hash** (permite logout/revogação de verdade); senha com **Argon2id**.
- Chaves primárias `cuid` (não sequenciais, seguras de expor).

## Segurança

- Senhas com Argon2id, refresh token em cookie `httpOnly`, rotação de refresh a cada uso.
- Helmet, CORS restrito à origem do front, rate limit (100 req/min).
- Validação de toda entrada com Zod.
