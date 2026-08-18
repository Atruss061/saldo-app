import { PrismaClient } from "@prisma/client";
import { seedCategoriesForUser } from "../src/lib/categories.js";

const prisma = new PrismaClient();

// Execução direta: semeia categorias para um usuário demo, se existir.
// (As categorias também são criadas automaticamente no registro de cada usuário.)
async function main() {
  if (process.env.NODE_ENV === "production") {
    console.log("Seed pulado em produção. Categorias são criadas no registro do usuário.");
    return;
  }

  const demoEmail = "demo@saldo.app";
  const existing = await prisma.user.findUnique({ where: { email: demoEmail } });

  if (!existing) {
    console.log(
      "Nenhum usuário demo encontrado.\n" +
        "As categorias padrão são semeadas automaticamente quando um usuário se registra (/auth/register)."
    );
    return;
  }

  await seedCategoriesForUser(existing.id);
  console.log(`Categorias semeadas para ${demoEmail}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
