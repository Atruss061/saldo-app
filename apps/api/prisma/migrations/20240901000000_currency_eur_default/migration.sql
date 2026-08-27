-- Foco em Portugal: novos utilizadores passam a ter o Euro como moeda padrão.
ALTER TABLE "users" ALTER COLUMN "currency" SET DEFAULT 'EUR';
