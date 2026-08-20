-- Marca ocorrências de fixos que o usuário editou à mão (exceções do mês).
-- A propagação a partir do molde não sobrescreve estas.
ALTER TABLE "transactions" ADD COLUMN "manuallyEdited" BOOLEAN NOT NULL DEFAULT false;
