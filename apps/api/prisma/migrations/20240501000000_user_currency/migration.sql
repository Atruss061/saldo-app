-- Moeda de exibição escolhida pelo usuário.
ALTER TABLE "users" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'BRL';
