-- Parcelamento no cartão de crédito: agrupa as parcelas de uma mesma compra.
ALTER TABLE "transactions" ADD COLUMN "installmentNo" INTEGER;
ALTER TABLE "transactions" ADD COLUMN "installmentGroup" TEXT;
CREATE INDEX "transactions_installmentGroup_idx" ON "transactions"("installmentGroup");
