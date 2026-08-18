import { prisma } from "./prisma.js";

// As 15 categorias da planilha original, com cor e ícone (Material Symbols).
export const DEFAULT_CATEGORIES = [
  { name: "Mercado", description: "Alimentos, bebidas e itens de limpeza da casa.", color: "#55E9A9", icon: "shopping_cart" },
  { name: "Necessidades", description: "Farmácia, higiene pessoal e itens da casa.", color: "#7C8CF8", icon: "health_and_safety" },
  { name: "Eletrônicos", description: "Computador, celular, notebook, consertos.", color: "#5AC8FA", icon: "devices" },
  { name: "Assinaturas", description: "Prime, Netflix, Google e afins.", color: "#FF9F45", icon: "subscriptions" },
  { name: "Roupa", description: "Roupas, sapatos e vestuário em geral.", color: "#FF6FB5", icon: "checkroom" },
  { name: "Beleza", description: "Maquiagem, manicure, salão, cosméticos.", color: "#FFB3B2", icon: "spa" },
  { name: "Presentes", description: "Presentes para amigos e familiares.", color: "#D48CFF", icon: "featured_seasonal_and_gifts" },
  { name: "Saúde", description: "Suplementos, academia, consultas.", color: "#2ECC8F", icon: "cardiology" },
  { name: "Despesas eventuais", description: "Gastos não planejados: veterinário, carro etc.", color: "#E5686B", icon: "warning" },
  { name: "Desenvolvimento", description: "Cursos, livros, planners, desenvolvimento pessoal.", color: "#4DD0A0", icon: "school" },
  { name: "Uber/transporte", description: "Uber, transporte e gasolina.", color: "#F7C948", icon: "local_taxi" },
  { name: "iFood/restaurante", description: "Restaurantes e delivery.", color: "#FF7A5C", icon: "restaurant" },
  { name: "Lazer", description: "Festas, cinema, teatro, aniversários.", color: "#B084FF", icon: "celebration" },
  { name: "Aluguel", description: "Custos com moradia.", color: "#8A94A6", icon: "home" },
  { name: "Contas", description: "Internet, água, luz, condomínio, IPTU.", color: "#6EC6FF", icon: "receipt_long" },
] as const;

/**
 * Semeia as categorias padrão para um usuário específico.
 * Idempotente: usa upsert baseado em (userId, name).
 */
export async function seedCategoriesForUser(userId: string) {
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { userId_name: { userId, name: cat.name } },
      update: {},
      create: { ...cat, userId, isDefault: true },
    });
  }
}
