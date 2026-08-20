-- Adiciona suporte a "dia útil" nos gastos fixos.
-- Quando businessDay = true, dayOfMonth passa a significar o N-ésimo dia útil do mês.
ALTER TABLE "recurring_expenses" ADD COLUMN "businessDay" BOOLEAN NOT NULL DEFAULT false;
