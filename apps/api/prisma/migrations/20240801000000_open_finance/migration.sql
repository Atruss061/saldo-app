-- Open Finance (integração bancária via Pluggy)

-- 1) Campos de origem/dedup na Transaction
ALTER TABLE "transactions" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "transactions" ADD COLUMN "externalId" TEXT;
CREATE UNIQUE INDEX "transactions_externalId_key" ON "transactions"("externalId");

-- 2) Conexões bancárias (itens do Pluggy)
CREATE TABLE "bank_connections" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "connectorId" INTEGER,
  "connectorName" TEXT,
  "connectorImage" TEXT,
  "status" TEXT NOT NULL DEFAULT 'UPDATING',
  "lastError" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bank_connections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "bank_connections_itemId_key" ON "bank_connections"("itemId");
CREATE INDEX "bank_connections_userId_idx" ON "bank_connections"("userId");
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Contas dentro de cada conexão
CREATE TABLE "bank_accounts" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "name" TEXT,
  "type" TEXT,
  "subtype" TEXT,
  "number" TEXT,
  "balance" DECIMAL(14,2),
  "currencyCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "bank_accounts_accountId_key" ON "bank_accounts"("accountId");
CREATE INDEX "bank_accounts_connectionId_idx" ON "bank_accounts"("connectionId");
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "bank_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
