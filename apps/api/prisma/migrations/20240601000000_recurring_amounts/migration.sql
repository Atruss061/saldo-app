-- Histórico de valores (vigência) dos gastos fixos.
CREATE TABLE "recurring_amounts" (
    "id" TEXT NOT NULL,
    "recurringId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "effYear" INTEGER NOT NULL,
    "effMonth" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recurring_amounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recurring_amounts_recurringId_effYear_effMonth_key" ON "recurring_amounts"("recurringId", "effYear", "effMonth");
CREATE INDEX "recurring_amounts_recurringId_idx" ON "recurring_amounts"("recurringId");

ALTER TABLE "recurring_amounts" ADD CONSTRAINT "recurring_amounts_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "recurring_expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cada gasto fixo existente ganha uma vigência inicial no seu mês de início.
INSERT INTO "recurring_amounts" ("id", "recurringId", "amount", "effYear", "effMonth", "createdAt")
SELECT gen_random_uuid()::text, "id", "amount", "startYear", "startMonth", CURRENT_TIMESTAMP
FROM "recurring_expenses";
